// divergenceScanner.h
#pragma once
#include <vector>
#include <deque>
#include <cmath>
#include <ctime>
#include <algorithm>

// ─── Data structures ─────────────────────────────────────────────────
struct Bar {
    std::time_t time;  // epoch seconds (UTC)
    double open, high, low, close;
    
    Bar() : time(0), open(0), high(0), low(0), close(0) {}
};

enum class DivergenceType { BULLISH, BEARISH };

// ─── RSI-14 calculator ────────────────────────────────────────────────
class RSI14 {
private:
    double avgGain = 0, avgLoss = 0;
    std::deque<double> gains, losses;
    bool initialized = false;
    
public:
    // feed new bar-close, returns RSI or NAN if not ready
    double add(double close, double prevClose) {
        double change = close - prevClose;
        double gain   = std::max(0.0, change);
        double loss   = std::max(0.0, -change);
        
        gains.push_back(gain);
        losses.push_back(loss);
        
        if (gains.size() > 14) {
            gains.pop_front();
            losses.pop_front();
        }
        
        if (!initialized && gains.size() == 14) {
            // first-time simple average
            for (int i = 0; i < 14; ++i) {
                avgGain += gains[i];
                avgLoss += losses[i];
            }
            avgGain /= 14;
            avgLoss /= 14;
            initialized = true;
        } else if (initialized) {
            // Wilder's smoothing
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

// ─── Divergence scanner ───────────────────────────────────────────────
class DivergenceScanner {
private:
    RSI14 rsiCalc;
    int lookback;
    double tol;

public:
    std::vector<Bar> bars;
    std::vector<double> rsis;
    
    // lookback = min bars between pivots, tol = double-top/bot tolerance
    DivergenceScanner(int lookbackBars = 6, double priceTol = 0.005)
        : lookback(lookbackBars), tol(priceTol) {}

    // call per new completed bar; returns true if divergence found
    bool onNewBar(const Bar& b,
                  DivergenceType &outType,
                  int &idx1, int &idx2) {
        bars.push_back(b);
        int n = bars.size();
        if (n < 16) return false;  // need at least 14 RSI + pivots

        // compute new RSI
        double prevClose = bars[n-2].close;
        double r = rsiCalc.add(b.close, prevClose);
        rsis.push_back(r);
        if (std::isnan(r)) return false;

        // check pivot at i2 = n-2 (previous bar, as current bar just completed)
        int i2 = n - 2;
        if (i2 < 1 || i2 >= n - 1) return false; // need bars before and after for pivot detection
        
        bool isHigh = (bars[i2].high > bars[i2-1].high && bars[i2].high > bars[i2+1].high);
        bool isLow  = (bars[i2].low  < bars[i2-1].low  && bars[i2].low  < bars[i2+1].low);
        if (!isHigh && !isLow) return false;

        // scan for prior pivot i1 in valid range
        int startIdx = std::max(2, i2 - lookback);
        for (int i1 = i2 - lookback; i1 >= startIdx && i1 >= 2; --i1) {
            bool wasHigh = (bars[i1].high > bars[i1-1].high && bars[i1].high > bars[i1+1].high);
            bool wasLow  = (bars[i1].low  < bars[i1-1].low  && bars[i1].low  < bars[i1+1].low);
            
            if (isHigh && wasHigh) {
                double p1 = bars[i1].high, p2 = bars[i2].high;
                double r1 = rsis[i1], r2 = rsis[i2];
                
                // double-top case: prices similar but RSI lower
                if (std::fabs(p2 - p1)/p1 < tol && r2 < r1) {
                    outType = DivergenceType::BEARISH;
                    idx1 = i1; idx2 = i2;
                    return true;
                }
                // classic bearish divergence: higher high but lower RSI
                if (p2 > p1 && r2 < r1) {
                    outType = DivergenceType::BEARISH;
                    idx1 = i1; idx2 = i2;
                    return true;
                }
            }
            
            if (isLow && wasLow) {
                double p1 = bars[i1].low, p2 = bars[i2].low;
                double r1 = rsis[i1], r2 = rsis[i2];
                
                // double-bottom case: prices similar but RSI higher
                if (std::fabs(p2 - p1)/p1 < tol && r2 > r1) {
                    outType = DivergenceType::BULLISH;
                    idx1 = i1; idx2 = i2;
                    return true;
                }
                // classic bullish divergence: lower low but higher RSI
                if (p2 < p1 && r2 > r1) {
                    outType = DivergenceType::BULLISH;
                    idx1 = i1; idx2 = i2;
                    return true;
                }
            }
        }
        return false;
    }
    
    // Reset the scanner for new symbol
    void reset() {
        bars.clear();
        rsis.clear();
        rsiCalc.reset();
    }
};