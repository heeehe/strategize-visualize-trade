// ============================
// File: runBacktest.cc
// ============================

// ============================
// File: runBacktest.cc
// ============================
// ============================
// File: runBacktest.cc - Fixed Position Management
// ============================
#pragma once
#include <napi.h>
#include <vector>
#include <string>
#include <iostream>
#include <numeric>
#include <cmath>
#include <deque>
#include <map>
#include "cirStrategy.h"
#include "technicalIndicators.h"
#include "divergenceScanner.h"

struct Trade {
    std::string date;
    std::string type;
    std::string symbol;
    double price;
    int shares;
    double profit;
    std::string reason;
};

struct Position {
    std::string symbol;
    double entryPrice;
    int shares;
    std::time_t entryTime;
    
    Position(const std::string& sym, double price, int sh, std::time_t time)
        : symbol(sym), entryPrice(price), shares(sh), entryTime(time) {}
};

struct EquityPoint {
    std::string date;
    double value;
};

Napi::Value runBacktest(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() != 4 || !info[0].IsBuffer() || !info[1].IsArray() || !info[2].IsArray() || !info[3].IsNumber()) {
        Napi::TypeError::New(env, "Expected arguments: buffer, symbols[], points[], initialCapital").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<double> buffer = info[0].As<Napi::Buffer<double>>();
    Napi::Array symbolsArray = info[1].As<Napi::Array>();
    Napi::Array pointsArray = info[2].As<Napi::Array>();
    double initialCapital = info[3].As<Napi::Number>();

    std::vector<std::string> symbols;
    for (uint32_t i = 0; i < symbolsArray.Length(); ++i) {
        symbols.push_back(symbolsArray.Get(i).As<Napi::String>().Utf8Value());
    }

    std::vector<size_t> pointsPerSymbol;
    for (uint32_t i = 0; i < pointsArray.Length(); ++i) {
        pointsPerSymbol.push_back(pointsArray.Get(i).As<Napi::Number>().Uint32Value());
    }

    double* rawData = reinterpret_cast<double*>(buffer.Data());
    size_t offset = 0, fields = 6;

    double capital = initialCapital;
    std::vector<Trade> trades;
    
    // Use map to track positions per symbol - FIFO approach (oldest first)
    std::map<std::string, std::vector<Position>> openPositions;
    std::vector<EquityPoint> equity;

    // Process all symbols and collect all trades with proper timestamps
    std::vector<std::pair<std::time_t, Trade>> allTradesWithTime;
    
    for (size_t s = 0; s < symbols.size(); ++s) {
        std::vector<Bar> bars;
        
        // Convert raw data to Bar structure for divergence scanner
        for (size_t i = 0; i < pointsPerSymbol[s]; ++i) {
            Bar bar;
            bar.time = static_cast<std::time_t>(rawData[offset]);     // timestamp
            bar.open = rawData[offset + 1];                          // open
            bar.high = rawData[offset + 2];                          // high
            bar.low = rawData[offset + 3];                           // low
            bar.close = rawData[offset + 4];                         // close
            // volume = rawData[offset + 5]; (not used in divergence scanner)
            
            bars.push_back(bar);
            offset += fields;
        }

        // Initialize divergence scanner with lookback=6 and tolerance=0.5%
        DivergenceScanner scanner(6, 0.005);
        
        // Process each bar through the divergence scanner
        for (size_t i = 0; i < bars.size(); ++i) {
            DivergenceType divType;
            int idx1, idx2;
            
            // Check for divergence signals
            bool hasDivergence = scanner.onNewBar(bars[i], divType, idx1, idx2);
            
            if (hasDivergence && i >= 16) { // Need at least 16 bars for RSI calculation
                double price = bars[i].close;
                const std::string& currentSymbol = symbols[s];
                
                if (divType == DivergenceType::BULLISH) {
                    // Bullish divergence detected - BUY signal
                    if (capital >= price * 10) {
                        Trade buy;
                        buy.date = std::to_string(static_cast<long long>(bars[i].time));
                        buy.type = "buy";
                        buy.symbol = currentSymbol;
                        buy.price = price;
                        buy.shares = 10;
                        buy.profit = 0;
                        buy.reason = "BULLISH_DIVERGENCE";
                        
                        // Add to open positions for this symbol
                        openPositions[currentSymbol].emplace_back(currentSymbol, price, 10, bars[i].time);
                        
                        allTradesWithTime.push_back({bars[i].time, buy});
                        capital -= price * 10;
                    }
                } else if (divType == DivergenceType::BEARISH) {
                    // Bearish divergence detected - SELL signal
                    // Close ALL open positions for this symbol (or you can modify to close just one)
                    if (openPositions.find(currentSymbol) != openPositions.end() && 
                        !openPositions[currentSymbol].empty()) {
                        
                        // Close all positions for this symbol (FIFO order)
                        while (!openPositions[currentSymbol].empty()) {
                            Position position = openPositions[currentSymbol].front();
                            openPositions[currentSymbol].erase(openPositions[currentSymbol].begin());

                            Trade sell;
                            sell.date = std::to_string(static_cast<long long>(bars[i].time));
                            sell.type = "sell";
                            sell.symbol = currentSymbol;
                            sell.price = price;
                            sell.shares = position.shares;
                            sell.profit = (sell.price - position.entryPrice) * sell.shares;
                            sell.reason = "BEARISH_DIVERGENCE";

                            allTradesWithTime.push_back({bars[i].time, sell});
                            capital += sell.price * sell.shares;
                        }
                    }
                }
            }
            
            // Update equity curve for every bar (after RSI calculation starts)
            if (i >= 15) { // Start after RSI has enough data
                std::string dateStr = std::to_string(static_cast<long long>(bars[i].time));
                equity.push_back({dateStr, capital});
            }
        }
        
        // Close any remaining open positions for this symbol at the end
        if (openPositions.find(symbols[s]) != openPositions.end()) {
            while (!openPositions[symbols[s]].empty()) {
                Position position = openPositions[symbols[s]].front();
                openPositions[symbols[s]].erase(openPositions[symbols[s]].begin());
                
                if (!bars.empty()) {
                    Trade sell;
                    sell.date = std::to_string(static_cast<long long>(bars.back().time));
                    sell.type = "sell";
                    sell.symbol = symbols[s];
                    sell.price = bars.back().close;
                    sell.shares = position.shares;
                    sell.profit = (sell.price - position.entryPrice) * sell.shares;
                    sell.reason = "END_OF_DATA";
                    
                    allTradesWithTime.push_back({bars.back().time, sell});
                    capital += sell.price * sell.shares;
                }
            }
        }
    }
    
    // Sort all trades by timestamp
    std::sort(allTradesWithTime.begin(), allTradesWithTime.end(), 
              [](const auto& a, const auto& b) { return a.first < b.first; });
    
    // Extract sorted trades
    for (const auto& tradeWithTime : allTradesWithTime) {
        trades.push_back(tradeWithTime.second);
    }

    // Calculate performance metrics
    double finalCap = capital;
    double totalReturn = ((finalCap - initialCapital) / initialCapital) * 100.0;
    
    // Calculate win rate by looking at sell trades only
    int wins = 0;
    int totalCompletedTrades = 0;
    for (const auto& trade : trades) {
        if (trade.type == "sell") {
            totalCompletedTrades++;
            if (trade.profit > 0) {
                wins++;
            }
        }
    }
    double winRate = totalCompletedTrades == 0 ? 0 : (double)wins / totalCompletedTrades * 100.0;

    // Calculate Sharpe ratio
    std::vector<double> returns;
    for (size_t i = 1; i < equity.size(); ++i) {
        if (equity[i - 1].value > 0) {
            double r = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
            returns.push_back(r);
        }
    }
    
    double avgR = 0, sharpe = 0;
    if (!returns.empty()) {
        avgR = std::accumulate(returns.begin(), returns.end(), 0.0) / returns.size();
        double var = 0.0;
        for (auto r : returns) var += (r - avgR) * (r - avgR);
        var /= returns.size();
        double stdDev = sqrt(var);
        sharpe = stdDev == 0 ? 0 : (avgR / stdDev) * sqrt(252);
    }

    // Calculate maximum drawdown
    double peak = initialCapital, maxDD = 0;
    for (auto& pt : equity) {
        peak = std::max(peak, pt.value);
        if (peak > 0) {
            double dd = (peak - pt.value) / peak * 100.0;
            maxDD = std::max(maxDD, dd);
        }
    }

    // Build result object
    Napi::Object result = Napi::Object::New(env);
    Napi::Object perf = Napi::Object::New(env);
    perf.Set("totalReturn", totalReturn);
    perf.Set("winRate", winRate);
    perf.Set("sharpeRatio", sharpe);
    perf.Set("maxDrawdown", maxDD);
    perf.Set("tradesCount", totalCompletedTrades);

    result.Set("performance", perf);
    result.Set("initialCapital", initialCapital);
    result.Set("finalCapital", finalCap);

    Napi::Array tArray = Napi::Array::New(env, trades.size());
    for (size_t i = 0; i < trades.size(); ++i) {
        Napi::Object t = Napi::Object::New(env);
        t.Set("date", trades[i].date);
        t.Set("type", trades[i].type);
        t.Set("symbol", trades[i].symbol);
        t.Set("price", trades[i].price);
        t.Set("shares", trades[i].shares);
        t.Set("profit", trades[i].profit);
        t.Set("reason", trades[i].reason);
        tArray.Set(i, t);
    }
    result.Set("trades", tArray);

    Napi::Array eqArray = Napi::Array::New(env, equity.size());
    for (size_t i = 0; i < equity.size(); ++i) {
        Napi::Object e = Napi::Object::New(env);
        e.Set("date", equity[i].date);
        e.Set("value", equity[i].value);
        eqArray.Set(i, e);
    }
    result.Set("equityCurve", eqArray);

    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("runBacktest", Napi::Function::New(env, runBacktest));
    return exports;
}

NODE_API_MODULE(runBacktestAddon, Init)
// #pragma once
// #include <napi.h>
// #include <vector>
// #include <string>
// #include <iostream>
// #include <numeric>
// #include <cmath>
// #include <deque>
// #include "cirStrategy.h"
// #include "technicalIndicators.h"
// #include "divergenceScanner.h"

// struct Trade {
//     std::string date;
//     std::string type;
//     std::string symbol;
//     double price;
//     int shares;
//     double profit;
//     std::string reason;
// };

// struct EquityPoint {
//     std::string date;
//     double value;
// };

// Napi::Value runBacktest(const Napi::CallbackInfo& info) {
//     Napi::Env env = info.Env();

//     if (info.Length() != 4 || !info[0].IsBuffer() || !info[1].IsArray() || !info[2].IsArray() || !info[3].IsNumber()) {
//         Napi::TypeError::New(env, "Expected arguments: buffer, symbols[], points[], initialCapital").ThrowAsJavaScriptException();
//         return env.Null();
//     }

//     Napi::Buffer<double> buffer = info[0].As<Napi::Buffer<double>>();
//     Napi::Array symbolsArray = info[1].As<Napi::Array>();
//     Napi::Array pointsArray = info[2].As<Napi::Array>();
//     double initialCapital = info[3].As<Napi::Number>();

//     std::vector<std::string> symbols;
//     for (uint32_t i = 0; i < symbolsArray.Length(); ++i) {
//         symbols.push_back(symbolsArray.Get(i).As<Napi::String>().Utf8Value());
//     }

//     std::vector<size_t> pointsPerSymbol;
//     for (uint32_t i = 0; i < pointsArray.Length(); ++i) {
//         pointsPerSymbol.push_back(pointsArray.Get(i).As<Napi::Number>().Uint32Value());
//     }

//     double* rawData = reinterpret_cast<double*>(buffer.Data());
//     size_t offset = 0, fields = 6;

//     double capital = initialCapital;
//     std::vector<Trade> trades;
//     std::vector<Trade> openPositions;
//     std::vector<EquityPoint> equity;

//     // Process all symbols and collect all trades with proper timestamps
//     std::vector<std::pair<std::time_t, Trade>> allTradesWithTime;
    
//     for (size_t s = 0; s < symbols.size(); ++s) {
//         std::vector<Bar> bars;
        
//         // Convert raw data to Bar structure for divergence scanner
//         for (size_t i = 0; i < pointsPerSymbol[s]; ++i) {
//             Bar bar;
//             bar.time = static_cast<std::time_t>(rawData[offset]);     // timestamp
//             bar.open = rawData[offset + 1];                          // open
//             bar.high = rawData[offset + 2];                          // high
//             bar.low = rawData[offset + 3];                           // low
//             bar.close = rawData[offset + 4];                         // close
//             // volume = rawData[offset + 5]; (not used in divergence scanner)
            
//             bars.push_back(bar);
//             offset += fields;
//         }

//         // Initialize divergence scanner with lookback=6 and tolerance=0.5%
//         DivergenceScanner scanner(6, 0.005);
//         std::vector<Trade> symbolOpenPositions;
        
//         // Process each bar through the divergence scanner
//         for (size_t i = 0; i < bars.size(); ++i) {
//             DivergenceType divType;
//             int idx1, idx2;
            
//             // Check for divergence signals
//             bool hasDivergence = scanner.onNewBar(bars[i], divType, idx1, idx2);
            
//             if (hasDivergence && i >= 16) { // Need at least 16 bars for RSI calculation
//                 double price = bars[i].close;
                
//                 if (divType == DivergenceType::BULLISH) {
//                     // Bullish divergence detected - BUY signal
//                     if (capital >= price * 10) {
//                         Trade buy;
//                         buy.date = std::to_string(static_cast<long long>(bars[i].time));
//                         buy.type = "buy";
//                         buy.symbol = symbols[s];
//                         buy.price = price;
//                         buy.shares = 10;
//                         buy.profit = 0;
//                         buy.reason = "BULLISH_DIVERGENCE";
                        
//                         symbolOpenPositions.push_back(buy);
//                         allTradesWithTime.push_back({bars[i].time, buy});
//                         capital -= price * 10;
//                     }
//                 } else if (divType == DivergenceType::BEARISH) {
//                     // Bearish divergence detected - SELL signal
//                     if (!symbolOpenPositions.empty()) {
//                         // Close the most recent position for this symbol
//                         Trade buyTrade = symbolOpenPositions.back();
//                         symbolOpenPositions.pop_back();

//                         Trade sell;
//                         sell.date = std::to_string(static_cast<long long>(bars[i].time));
//                         sell.type = "sell";
//                         sell.symbol = symbols[s];
//                         sell.price = price;
//                         sell.shares = buyTrade.shares;
//                         sell.profit = (sell.price - buyTrade.price) * sell.shares;
//                         sell.reason = "BEARISH_DIVERGENCE";

//                         allTradesWithTime.push_back({bars[i].time, sell});
//                         capital += sell.price * sell.shares;
//                     }
//                 }
//             }
            
//             // Update equity curve for every bar (after RSI calculation starts)
//             if (i >= 15) { // Start after RSI has enough data
//                 std::string dateStr = std::to_string(static_cast<long long>(bars[i].time));
//                 equity.push_back({dateStr, capital});
//             }
//         }
        
//         // Close any remaining open positions for this symbol at the end
//         for (auto& position : symbolOpenPositions) {
//             if (!bars.empty()) {
//                 Trade sell;
//                 sell.date = std::to_string(static_cast<long long>(bars.back().time));
//                 sell.type = "sell";
//                 sell.symbol = symbols[s];
//                 sell.price = bars.back().close;
//                 sell.shares = position.shares;
//                 sell.profit = (sell.price - position.price) * sell.shares;
//                 sell.reason = "END_OF_DATA";
                
//                 allTradesWithTime.push_back({bars.back().time, sell});
//                 capital += sell.price * sell.shares;
//             }
//         }
//     }
    
//     // Sort all trades by timestamp
//     std::sort(allTradesWithTime.begin(), allTradesWithTime.end(), 
//               [](const auto& a, const auto& b) { return a.first < b.first; });
    
//     // Extract sorted trades
//     for (const auto& tradeWithTime : allTradesWithTime) {
//         trades.push_back(tradeWithTime.second);
//     }

//     // Calculate performance metrics
//     double finalCap = capital;
//     double totalReturn = ((finalCap - initialCapital) / initialCapital) * 100.0;
    
//     // Calculate win rate by looking at sell trades only
//     int wins = 0;
//     int totalCompletedTrades = 0;
//     for (const auto& trade : trades) {
//         if (trade.type == "sell") {
//             totalCompletedTrades++;
//             if (trade.profit > 0) {
//                 wins++;
//             }
//         }
//     }
//     double winRate = totalCompletedTrades == 0 ? 0 : (double)wins / totalCompletedTrades * 100.0;

//     // Calculate Sharpe ratio
//     std::vector<double> returns;
//     for (size_t i = 1; i < equity.size(); ++i) {
//         if (equity[i - 1].value > 0) {
//             double r = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
//             returns.push_back(r);
//         }
//     }
    
//     double avgR = 0, sharpe = 0;
//     if (!returns.empty()) {
//         avgR = std::accumulate(returns.begin(), returns.end(), 0.0) / returns.size();
//         double var = 0.0;
//         for (auto r : returns) var += (r - avgR) * (r - avgR);
//         var /= returns.size();
//         double stdDev = sqrt(var);
//         sharpe = stdDev == 0 ? 0 : (avgR / stdDev) * sqrt(252);
//     }

//     // Calculate maximum drawdown
//     double peak = initialCapital, maxDD = 0;
//     for (auto& pt : equity) {
//         peak = std::max(peak, pt.value);
//         if (peak > 0) {
//             double dd = (peak - pt.value) / peak * 100.0;
//             maxDD = std::max(maxDD, dd);
//         }
//     }

//     // Build result object
//     Napi::Object result = Napi::Object::New(env);
//     Napi::Object perf = Napi::Object::New(env);
//     perf.Set("totalReturn", totalReturn);
//     perf.Set("winRate", winRate);
//     perf.Set("sharpeRatio", sharpe);
//     perf.Set("maxDrawdown", maxDD);
//     perf.Set("tradesCount", totalCompletedTrades);

//     result.Set("performance", perf);
//     result.Set("initialCapital", initialCapital);
//     result.Set("finalCapital", finalCap);

//     Napi::Array tArray = Napi::Array::New(env, trades.size());
//     for (size_t i = 0; i < trades.size(); ++i) {
//         Napi::Object t = Napi::Object::New(env);
//         t.Set("date", trades[i].date);
//         t.Set("type", trades[i].type);
//         t.Set("symbol", trades[i].symbol);
//         t.Set("price", trades[i].price);
//         t.Set("shares", trades[i].shares);
//         t.Set("profit", trades[i].profit);
//         t.Set("reason", trades[i].reason);
//         tArray.Set(i, t);
//     }
//     result.Set("trades", tArray);

//     Napi::Array eqArray = Napi::Array::New(env, equity.size());
//     for (size_t i = 0; i < equity.size(); ++i) {
//         Napi::Object e = Napi::Object::New(env);
//         e.Set("date", equity[i].date);
//         e.Set("value", equity[i].value);
//         eqArray.Set(i, e);
//     }
//     result.Set("equityCurve", eqArray);

//     return result;
// }

// Napi::Object Init(Napi::Env env, Napi::Object exports) {
//     exports.Set("runBacktest", Napi::Function::New(env, runBacktest));
//     return exports;
// }

// NODE_API_MODULE(runBacktestAddon, Init)



