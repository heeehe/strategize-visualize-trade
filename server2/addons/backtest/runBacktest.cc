// ============================
// File: runBacktest.cc
// ============================
#pragma once
#include <napi.h>
#include <vector>
#include <string>
#include <iostream>
#include <numeric>
#include <cmath>
#include "cirStrategy.h"
#include "technicalIndicators.h"

struct Trade {
    std::string date;
    std::string type;
    std::string symbol;
    double price;
    int shares;
    double profit;
    std::string reason;
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
    std::vector<Trade> openPositions;
    std::vector<EquityPoint> equity;

    for (size_t s = 0; s < symbols.size(); ++s) {
        std::vector<double> closes;
        std::vector<std::string> timestamps;

        for (size_t i = 0; i < pointsPerSymbol[s]; ++i) {
            double ts = rawData[offset];
            double close = rawData[offset + 4];
            closes.push_back(close);
            timestamps.push_back(std::to_string((long long)ts));
            offset += fields;
        }

        std::vector<std::string> signals(closes.size(), "HOLD");
        std::vector<double> rsi = calculateRSI(closes, 14);
        for (size_t i = 14; i < closes.size(); ++i) {
            if (rsi[i] < 30) signals[i] = "BUY";
            else if (rsi[i] > 70) signals[i] = "SELL";
        }

        for (size_t i = 14; i < closes.size(); ++i) {
            std::string signal = signals[i];
            double price = closes[i];

            if (signal == "BUY") {
                if (capital >= price * 10) {
                    Trade buy;
                    buy.date = timestamps[i];
                    buy.type = "buy";
                    buy.symbol = symbols[s];
                    buy.price = price;
                    buy.shares = 10;
                    buy.profit = 0;
                    buy.reason = "RSI BUY";
                    openPositions.push_back(buy);
                    capital -= price * 10;
                }
            } else if (signal == "SELL" && !openPositions.empty()) {
                Trade buy = openPositions.back();
                openPositions.pop_back();

                Trade sell;
                sell.date = timestamps[i];
                sell.type = "sell";
                sell.symbol = symbols[s];
                sell.price = price;
                sell.shares = buy.shares;
                sell.profit = (sell.price - buy.price) * sell.shares;
                sell.reason = "RSI SELL";

                trades.push_back(buy);
                trades.push_back(sell);
                capital += sell.price * sell.shares;
            }

            equity.push_back({timestamps[i], capital});
        }
    }

    double finalCap = capital;
    double totalReturn = ((finalCap - initialCapital) / initialCapital) * 100.0;
    int wins = 0;
    for (auto& t : trades) if (t.type == "sell" && t.profit > 0) wins++;
    double winRate = trades.empty() ? 0 : (double)wins / (trades.size() / 2) * 100.0;

    std::vector<double> returns;
    for (size_t i = 1; i < equity.size(); ++i) {
        double r = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
        returns.push_back(r);
    }
    double avgR = std::accumulate(returns.begin(), returns.end(), 0.0) / returns.size();
    double var = 0.0;
    for (auto r : returns) var += (r - avgR) * (r - avgR);
    var /= returns.size();
    double stdDev = sqrt(var);
    double sharpe = stdDev == 0 ? 0 : (avgR / stdDev) * sqrt(252);

    double peak = initialCapital, maxDD = 0;
    for (auto& pt : equity) {
        peak = std::max(peak, pt.value);
        double dd = (peak - pt.value) / peak * 100.0;
        maxDD = std::max(maxDD, dd);
    }

    Napi::Object result = Napi::Object::New(env);
    Napi::Object perf = Napi::Object::New(env);
    perf.Set("totalReturn", totalReturn);
    perf.Set("winRate", winRate);
    perf.Set("sharpeRatio", sharpe);
    perf.Set("maxDrawdown", maxDD);
    perf.Set("tradesCount", (int)(trades.size() / 2));

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
// #include <napi.h>
// #include <vector>
// #include <string>
// #include <iostream>

// // Struct to represent a trade
// struct Trade {
//     std::string date;
//     std::string type;
//     std::string symbol;
//     double price;
//     int shares;
//     double profit;
//     std::string reason;
// };

// // Struct to represent an equity curve point
// struct EquityPoint {
//     std::string date;
//     double value;
// };

// // Helper to parse JS array of strings
// std::vector<std::string> parseSymbols(const Napi::Array& arr) {
//     std::vector<std::string> symbols;
//     for (uint32_t i = 0; i < arr.Length(); i++) {
//         symbols.push_back(arr.Get(i).As<Napi::String>().Utf8Value());
//     }
//     return symbols;
// }

// // Helper to parse JS array of points
// std::vector<size_t> parsePoints(const Napi::Array& arr) {
//     std::vector<size_t> points;
//     for (uint32_t i = 0; i < arr.Length(); i++) {
//         points.push_back(arr.Get(i).As<Napi::Number>().Uint32Value());
//     }
//     return points;
// }

// // Main backtest function
// Napi::Value runBacktest(const Napi::CallbackInfo& info) {
//     Napi::Env env = info.Env();

//     // --- Step 1: Validate and extract arguments ---
//     if (info.Length() != 4) {
//         Napi::TypeError::New(env, "Expected 4 arguments").ThrowAsJavaScriptException();
//         return env.Null();
//     }
//     if (!info[0].IsBuffer()) {
//       Napi::TypeError::New(env, "First argument must be a Buffer (SharedArrayBuffer)").ThrowAsJavaScriptException();
//       return env.Null();
//     }

//     // Validate second argument: symbols array
//     if (!info[1].IsArray()) {
//         Napi::TypeError::New(env, "Second argument must be an Array of symbols").ThrowAsJavaScriptException();
//         return env.Null();
//     }

//     // Validate third argument: points per symbol array
//     if (!info[2].IsArray()) {
//         Napi::TypeError::New(env, "Third argument must be an Array of points per symbol").ThrowAsJavaScriptException();
//         return env.Null();
//     }

//     // Validate fourth argument: initial capital
//     if (!info[3].IsNumber()) {
//         Napi::TypeError::New(env, "Fourth argument must be a Number (initialCapital)").ThrowAsJavaScriptException();
//         return env.Null();
//     }

//     Napi::Buffer<double> buffer = info[0].As<Napi::Buffer<double>>();
//     Napi::Array symbolsArray = info[1].As<Napi::Array>();
//     Napi::Array pointsArray = info[2].As<Napi::Array>();
//     double initialCapital = info[3].As<Napi::Number>().DoubleValue();

//     std::vector<std::string> symbols = parseSymbols(symbolsArray);
//     std::vector<size_t> pointsPerSymbol = parsePoints(pointsArray);
//     double* rawData = reinterpret_cast<double*>(buffer.Data());

//     size_t fieldsPerCandle = 6;
//     size_t totalCandles = 0;
//     for (auto p : pointsPerSymbol) {
//         totalCandles += p;
//     }

//     // Optional: Validate that buffer length matches expectation
//     if (buffer.Length() != totalCandles * fieldsPerCandle) {
//         Napi::TypeError::New(env, "Mismatch between buffer size and pointsPerSymbol size").ThrowAsJavaScriptException();
//         return env.Null();
//     }

//     // --- Step 2: Initialize variables ---
//     double capital = initialCapital;
//     double peak = initialCapital;
//     double finalCapital = 0;
//     double maxDrawdown = 0;
//     std::vector<Trade> trades;
//     std::vector<EquityPoint> equityCurve;

//     // --- Step 3: Run simple dummy backtest ---
//     size_t currentOffset = 0;
//     for (size_t symbolIdx = 0; symbolIdx < symbols.size(); ++symbolIdx) {
//         const std::string& symbol = symbols[symbolIdx];
//         size_t points = pointsPerSymbol[symbolIdx];

//         for (size_t i = 0; i < points; ++i) {
//             double timestamp = rawData[currentOffset];
//             double open = rawData[currentOffset + 1];
//             double high = rawData[currentOffset + 2];
//             double low = rawData[currentOffset + 3];
//             double close = rawData[currentOffset + 4];
//             double volume = rawData[currentOffset + 5];
//             currentOffset += fieldsPerCandle;

//             // Example: Dummy buy and sell logic
//             if (i % 100 == 0) { // Every 100 candles, pretend to "buy"
//                 Trade t;
//                 t.date = std::to_string(static_cast<long long>(timestamp));
//                 t.type = "buy";
//                 t.symbol = symbol;
//                 t.price = close;
//                 t.shares = 10;
//                 t.profit = 0;
//                 t.reason = "dummy-buy";
//                 trades.push_back(t);

//                 capital -= close * 10;
//             }
//             if (i % 105 == 0) { // Every 105 candles, pretend to "sell"
//                 Trade t;
//                 t.date = std::to_string(static_cast<long long>(timestamp));
//                 t.type = "sell";
//                 t.symbol = symbol;
//                 t.price = close;
//                 t.shares = 10;
//                 t.profit = (close - 100) * 10; // Assume buy price was 100
//                 t.reason = "dummy-sell";
//                 trades.push_back(t);

//                 capital += close * 10;
//             }

//             // Update equity curve
//             EquityPoint e;
//             e.date = std::to_string(static_cast<long long>(timestamp));
//             e.value = capital;
//             equityCurve.push_back(e);

//             // Track peak and max drawdown
//             if (capital > peak) peak = capital;
//             double drawdown = (peak - capital) / peak * 100;
//             if (drawdown > maxDrawdown) maxDrawdown = drawdown;
//         }
//     }

//     finalCapital = capital;
//     double totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100.0;

//     // --- Step 4: Build result object ---
//     Napi::Object result = Napi::Object::New(env);
//     result.Set("initialCapital", initialCapital);
//     result.Set("finalCapital", finalCapital);
//     result.Set("totalReturn", totalReturn);
//     result.Set("maxDrawdown", maxDrawdown);

//     // Build trades array
//     Napi::Array tradesArray = Napi::Array::New(env, trades.size());
//     for (size_t i = 0; i < trades.size(); ++i) {
//         Napi::Object tradeObj = Napi::Object::New(env);
//         tradeObj.Set("date", trades[i].date);
//         tradeObj.Set("type", trades[i].type);
//         tradeObj.Set("symbol", trades[i].symbol);
//         tradeObj.Set("price", trades[i].price);
//         tradeObj.Set("shares", trades[i].shares);
//         tradeObj.Set("profit", trades[i].profit);
//         tradeObj.Set("reason", trades[i].reason);
//         tradesArray.Set(i, tradeObj);
//     }
//     result.Set("trades", tradesArray);

//     // Build equityCurve array
//     Napi::Array equityArray = Napi::Array::New(env, equityCurve.size());
//     for (size_t i = 0; i < equityCurve.size(); ++i) {
//         Napi::Object pointObj = Napi::Object::New(env);
//         pointObj.Set("date", equityCurve[i].date);
//         pointObj.Set("value", equityCurve[i].value);
//         equityArray.Set(i, pointObj);
//     }
//     result.Set("equityCurve", equityArray);

//     return result;
// }

// // Register addon
// Napi::Object Init(Napi::Env env, Napi::Object exports) {
//     exports.Set("runBacktest", Napi::Function::New(env, runBacktest));
//     return exports;
// }

// NODE_API_MODULE(runBacktestAddon, Init)

