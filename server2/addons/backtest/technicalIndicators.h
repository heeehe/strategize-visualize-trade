// technicalIndicators.h
#pragma once
#include <vector>
#include <numeric>
#include <cmath>

std::vector<double> calculateEMA(const std::vector<double>& prices, int period) {
    std::vector<double> ema(prices.size(), 0.0);

    if (prices.empty() || period <= 0) return ema;

    double multiplier = 2.0 / (period + 1);
    ema[0] = prices[0]; // Start with first price

    for (size_t i = 1; i < prices.size(); ++i) {
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
}

std::vector<double> calculateRSI(const std::vector<double>& prices, int period) {
    std::vector<double> rsi(prices.size(), 50.0); // Default mid value
    if (prices.size() < period + 1) return rsi;

    double gain = 0.0, loss = 0.0;
    for (int i = 1; i <= period; ++i) {
        double change = prices[i] - prices[i - 1];
        if (change >= 0) gain += change;
        else loss -= change;
    }
    gain /= period;
    loss /= period;

    if (loss == 0) rsi[period] = 100.0;
    else {
        double rs = gain / loss;
        rsi[period] = 100.0 - (100.0 / (1.0 + rs));
    }

    for (size_t i = period + 1; i < prices.size(); ++i) {
        double change = prices[i] - prices[i - 1];
        if (change >= 0) {
            gain = (gain * (period - 1) + change) / period;
            loss = (loss * (period - 1)) / period;
        } else {
            gain = (gain * (period - 1)) / period;
            loss = (loss * (period - 1) - change) / period;
        }

        if (loss == 0) rsi[i] = 100.0;
        else {
            double rs = gain / loss;
            rsi[i] = 100.0 - (100.0 / (1.0 + rs));
        }
    }
    return rsi;
}
