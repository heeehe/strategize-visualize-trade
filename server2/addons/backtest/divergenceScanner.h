// ============================
// File: divergenceScanner.h
// ============================
#pragma once
#include <vector>
#include <deque>
#include <cmath>
#include <ctime>
#include <algorithm>
#include <string>
#include <map>

// ─── Data Structures ────────────────────────────────────────────────
struct Bar {
    std::time_t time;
    double open, high, low, close;

    Bar() : time(0), open(0), high(0), low(0), close(0) {}
};

enum class DivergenceType { BULLISH, BEARISH };

// ─── RSI Calculator ─────────────────────────────────────────────────
class RSI14 {
    double avgGain = 0, avgLoss = 0;
    std::deque<double> gains, losses;
    bool initialized = false;

public:
    double add(double close, double prevClose) {
        double change = close - prevClose;
        double gain = std::max(0.0, change);
        double loss = std::max(0.0, -change);
        gains.push_back(gain);
        losses.push_back(loss);

        if (gains.size() > 14) {
            gains.pop_front();
            losses.pop_front();
        }

        if (!initialized && gains.size() == 14) {
            avgGain = std::accumulate(gains.begin(), gains.end(), 0.0) / 14;
            avgLoss = std::accumulate(losses.begin(), losses.end(), 0.0) / 14;
            initialized = true;
        } else if (initialized) {
            avgGain = (avgGain * 13 + gain) / 14;
            avgLoss = (avgLoss * 13 + loss) / 14;
        }

        if (!initialized) return NAN;
        if (avgLoss == 0) return 100.0;
        double rs = avgGain / avgLoss;
        return 100.0 - (100.0 / (1 + rs));
    }

    void reset() {
        avgGain = 0;
        avgLoss = 0;
        gains.clear();
        losses.clear();
        initialized = false;
    }
};

// ─── ATR Calculator ─────────────────────────────────────────────────
class ATRCalculator {
    int period;
    std::deque<double> trList;
    double prevClose = NAN;

public:
    ATRCalculator(int p) : period(p) {}

    double add(const Bar& b) {
        if (std::isnan(prevClose)) {
            prevClose = b.close;
            return NAN;
        }

        double tr = std::max({ b.high - b.low, fabs(b.high - prevClose), fabs(b.low - prevClose) });
        trList.push_back(tr);
        prevClose = b.close;

        if (trList.size() > period)
            trList.pop_front();

        if (trList.size() < period)
            return NAN;

        double sum = std::accumulate(trList.begin(), trList.end(), 0.0);
        return sum / period;
    }

    void reset() {
        trList.clear();
        prevClose = NAN;
    }
};

// ─── Trade Struct (for Backtest) ─────────────────────────────────────
struct Trade {
    std::string date;
    std::string type;
    std::string symbol;
    double price;
    int shares;
    double profit;
    std::string reason;
};

// ─── Equity Point Struct ─────────────────────────────────────────────
struct EquityPoint {
    std::string date;
    double value;
};

// ─── Backtest Strategy ───────────────────────────────────────────────
class BacktestStrategy {
    std::vector<Bar> bars;
    std::vector<double> closeHistory;
    std::vector<double> rsiHistory;

    std::string symbol;
    double capital;
    bool stopFlag = false;

    RSI14 rsiCalc;
    ATRCalculator* atrCalc = nullptr;

    struct ActiveTrade {
        double entryPrice;
        double trailHigh;
        double atrAtEntry;
    };

    std::map<std::string, ActiveTrade> activeTrades;
    std::vector<Trade> trades;
    std::vector<EquityPoint> equity;

    struct Settings {
        int atrPeriod;
        double atrMultiplier;
        bool rsiExit;
    };

    Settings settings;

    Settings getSectorSettings(const std::string& sector) {
        if (sector == "Banking & Financial Services") return {14, 2.0, true};
        if (sector == "Energy & Power") return {10, 2.5, true};
        if (sector == "Infrastructure & Engineering") return {14, 1.5, false};
        if (sector == "Chemicals & Specialty Materials") return {14, 1.2, false};
        if (sector == "Iron & Steel") return {14, 2.0, false};
        if (sector == "Textiles & Manufacturing") return {14, 1.5, false};
        if (sector == "Logistics & Real Estate") return {14, 2.0, true};
        return {14, 2.0, false};
    }

    std::string timeToDate(std::time_t t) {
        return std::to_string(t);
    }

public:
    BacktestStrategy(const std::string& sector, double initialCapital) {
        settings = getSectorSettings(sector);
        capital = initialCapital;
        atrCalc = new ATRCalculator(settings.atrPeriod);
    }

    ~BacktestStrategy() {
        delete atrCalc;
    }

    void setSymbol(const std::string& sym) {
        symbol = sym;
    }

    void onNewBar(const Bar& bar) {
        bars.push_back(bar);
        closeHistory.push_back(bar.close);

        double atr = atrCalc->add(bar);
        double rsi = bars.size() > 1 ? rsiCalc.add(bar.close, bars[bars.size() - 2].close) : NAN;

        if (!std::isnan(rsi))
            rsiHistory.push_back(rsi);

        if (rsiHistory.size() > 100) rsiHistory.erase(rsiHistory.begin());
        if (bars.size() > 100) bars.erase(bars.begin());
        if (closeHistory.size() > 100) closeHistory.erase(closeHistory.begin());

        // Exit logic
        if (activeTrades.count(symbol)) {
            auto& trade = activeTrades[symbol];
            double newTrailHigh = std::max(trade.trailHigh, bar.close);
            double exitLevel = trade.entryPrice + (settings.atrMultiplier * trade.atrAtEntry);
            double gain = (bar.close - trade.entryPrice) / trade.entryPrice * 100.0;

            bool shouldExit =
                (bar.close <= exitLevel && (!settings.rsiExit || rsi < 55)) ||
                gain >= 15 ||
                bar.close <= trade.entryPrice * 1.05;

            if (shouldExit) {
                Trade t;
                t.date = timeToDate(bar.time);
                t.type = "sell";
                t.symbol = symbol;
                t.price = bar.close;
                int shares = trades.back().shares;
                t.shares = shares;
                t.profit = (bar.close - trade.entryPrice) * shares;
                capital += bar.close * shares;
                t.reason = "Exit (trailing strategy)";
                trades.push_back(t);

                capital += bar.close;
                activeTrades.erase(symbol);

                if (capital <= 0) stopFlag = true;
                return;
            }

            trade.trailHigh = newTrailHigh;
        }

        // Entry logic
        std::string signal = detectDivergence();
        if (!signal.empty() && activeTrades.count(symbol) == 0 && !std::isnan(atr)) {
            int shares = 15;
            double cost = shares * bar.close;
            if (capital >= cost) {
                activeTrades[symbol] = {bar.close, bar.close, atr};
                capital -= cost;

                Trade t;
                t.date = timeToDate(bar.time);
                t.type = "buy";
                t.symbol = symbol;
                t.price = bar.close;
                t.shares = shares;
                t.profit = 0;
                t.reason = signal;
                trades.push_back(t);
            }
        }

        equity.push_back({timeToDate(bar.time), capital});
    }

    std::string detectDivergence() {
        if (bars.size() < 20 || rsiHistory.size() < 20) return "";

        int recent = bars.size() - 1;
        int past = recent - 10;

        double priceNow = bars[recent].close;
        double pricePrev = bars[past].close;
        double highNow = bars[recent].high;
        double highPrev = bars[past].high;
        double lowNow = bars[recent].low;
        double lowPrev = bars[past].low;

        double rsiNow = rsiHistory[rsiHistory.size() - 1];
        double rsiPrev = rsiHistory[rsiHistory.size() - 11];

        bool isDoubleTop = std::abs(highNow - highPrev) / highPrev < 0.01;
        bool isDoubleBottom = std::abs(lowNow - lowPrev) / lowPrev < 0.01;

        if (highNow > highPrev && rsiNow < rsiPrev) return "Bearish Divergence";
        if (lowNow < lowPrev && rsiNow > rsiPrev) return "Bullish Divergence";
        if (isDoubleTop && rsiNow < rsiPrev) return "Bearish Double Top Divergence";
        if (isDoubleBottom && rsiNow > rsiPrev) return "Bullish Double Bottom Divergence";
        if (priceNow > pricePrev && rsiNow <= rsiPrev) return "Weak Bearish Divergence";
        if (priceNow < pricePrev && rsiNow >= rsiPrev) return "Weak Bullish Divergence";

        return "";
    }

    bool shouldStop() const { return stopFlag; }
    double getCapital() const { return capital; }
    const std::vector<Trade>& getTrades() const { return trades; }
    const std::vector<EquityPoint>& getEquity() const { return equity; }
};
