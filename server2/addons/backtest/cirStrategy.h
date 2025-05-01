#pragma once
#include <vector>
#include <string>
#include <random>
#include <algorithm>

void simulateCIR(const double& alpha, const double& beta, const double& sigma,
                 const double& r0, const double& T, const double& dt,
                 std::vector<double>& rates,
                 std::vector<std::string>& signals) {

    std::random_device rd;
    std::mt19937 generator(rd());
    std::normal_distribution<double> normal(0.0, 1.0);

    int steps = static_cast<int>(T / dt);
    rates.resize(steps + 1);
    signals.resize(steps + 1, "HOLD");

    rates[0] = r0;

    for (int i = 1; i <= steps; ++i) {
        double dW = normal(generator);
        double prevRate = rates[i - 1];

        double newRate = prevRate + beta * (alpha - prevRate) * dt + sigma * sqrt(std::max(0.0, prevRate)) * sqrt(dt) * dW;
        rates[i] = std::max(0.0, newRate);

        if (prevRate <= alpha && rates[i] > alpha) {
            signals[i] = "BUY";
        } else if (prevRate >= alpha && rates[i] < alpha) {
            signals[i] = "SELL";
        }
    }
}
