/// ============================
// File: runBacktest.cc
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
#include "technicalIndicators.h"
#include "divergenceScanner.h"


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
    for (uint32_t i = 0; i < symbolsArray.Length(); ++i)
        symbols.push_back(symbolsArray.Get(i).As<Napi::String>().Utf8Value());

    std::vector<size_t> pointsPerSymbol;
    for (uint32_t i = 0; i < pointsArray.Length(); ++i)
        pointsPerSymbol.push_back(pointsArray.Get(i).As<Napi::Number>().Uint32Value());

    double* rawData = reinterpret_cast<double*>(buffer.Data());
    size_t offset = 0;
    const size_t fields = 6;

    double capital = initialCapital;
    std::vector<Trade> trades;
    std::vector<EquityPoint> equity;
    std::vector<std::pair<std::time_t, Trade>> allTradesWithTime;

    for (size_t s = 0; s < symbols.size(); ++s) {
        std::string symbol = symbols[s];
        std::vector<Bar> bars;

        for (size_t i = 0; i < pointsPerSymbol[s]; ++i) {
            Bar bar;
            bar.time = static_cast<std::time_t>(rawData[offset]);
            bar.open = rawData[offset + 1];
            bar.high = rawData[offset + 2];
            bar.low  = rawData[offset + 3];
            bar.close = rawData[offset + 4];
            bars.push_back(bar);
            offset += fields;
        }

        BacktestStrategy strategy("Banking & Financial Services", capital); // Hardcoded sector
        strategy.setSymbol(symbol);

        for (const auto& bar : bars) {
            strategy.onNewBar(bar);
            if (strategy.shouldStop()) break;
        }

        // Extract trades and update capital
        for (const auto& t : strategy.getTrades()) {
            allTradesWithTime.emplace_back(std::stoll(t.date), t);
        }
        capital = strategy.getCapital();

        for (const auto& eq : strategy.getEquity()) {
            equity.push_back(eq);
        }
    }

    std::sort(allTradesWithTime.begin(), allTradesWithTime.end(),
              [](const auto& a, const auto& b) { return a.first < b.first; });
    for (const auto& t : allTradesWithTime) trades.push_back(t.second);

    double finalCap = capital;
    double totalReturn = ((finalCap - initialCapital) / initialCapital) * 100.0;
    int wins = 0, totalCompleted = 0;

    for (const auto& t : trades) {
        if (t.type == "sell") {
            ++totalCompleted;
            if (t.profit > 0) ++wins;
        }
    }

    double winRate = totalCompleted ? (wins * 100.0 / totalCompleted) : 0;

    std::vector<double> returns;
    for (size_t i = 1; i < equity.size(); ++i) {
        if (equity[i - 1].value > 0) {
            returns.push_back((equity[i].value - equity[i - 1].value) / equity[i - 1].value);
        }
    }

    double avgR = 0, sharpe = 0;
    if (!returns.empty()) {
        avgR = std::accumulate(returns.begin(), returns.end(), 0.0) / returns.size();
        double var = 0.0;
        for (auto r : returns) var += (r - avgR) * (r - avgR);
        double stdDev = sqrt(var / returns.size());
        sharpe = stdDev == 0 ? 0 : (avgR / stdDev) * sqrt(252);
    }

    double peak = initialCapital, maxDD = 0;
    for (const auto& pt : equity) {
        peak = std::max(peak, pt.value);
        maxDD = std::max(maxDD, (peak - pt.value) / peak * 100.0);
    }

    Napi::Object result = Napi::Object::New(env);
    Napi::Object perf = Napi::Object::New(env);
    perf.Set("totalReturn", totalReturn);
    perf.Set("winRate", winRate);
    perf.Set("sharpeRatio", sharpe);
    perf.Set("maxDrawdown", maxDD);
    perf.Set("tradesCount", totalCompleted);
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




