//
//  PortfolioCalculator.swift
//  iOS Portföy Takip Uygulaması
//
//  Created for Antigravity iOS App Plan
//

import Foundation

public final class PortfolioCalculator: ObservableObject {
    @Published public var holdings: [PortfolioHolding] = []
    @Published public var sales: [SaleRecord] = []
    
    public init() {}
    
    /// Ağırlıklı Ortalama Maliyet ile Alım İşlemi Ekleme
    public func addBuy(
        symbol: String,
        name: String,
        category: AssetCategory,
        quantity: Double,
        price: Double,
        date: Date = Date(),
        fee: Double = 0.0
    ) {
        let upperSymbol = symbol.uppercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let buyTx = BuyTransaction(date: date, price: price, quantity: quantity, fee: fee)
        
        if let index = holdings.firstIndex(where: { $0.symbol == upperSymbol }) {
            let current = holdings[index]
            let oldTotalCost = current.quantity * current.avgCost
            let newBuyTotalCost = (quantity * price) + fee
            let newTotalQty = current.quantity + quantity
            let newAvgCost = (oldTotalCost + newBuyTotalCost) / newTotalQty
            
            var updatedTx = current.transactions
            updatedTx.append(buyTx)
            
            holdings[index] = PortfolioHolding(
                id: current.id,
                symbol: current.symbol,
                name: name.isEmpty ? current.name : name,
                category: category,
                quantity: newTotalQty,
                avgCost: newAvgCost,
                currentPrice: current.currentPrice,
                previousClosePrice: current.previousClosePrice,
                transactions: updatedTx
            )
        } else {
            let totalCost = (quantity * price) + fee
            let avgCost = totalCost / quantity
            let newHolding = PortfolioHolding(
                symbol: upperSymbol,
                name: name.isEmpty ? upperSymbol : name,
                category: category,
                quantity: quantity,
                avgCost: avgCost,
                currentPrice: price,
                previousClosePrice: price,
                transactions: [buyTx]
            )
            holdings.append(newHolding)
        }
    }
    
    /// Satış Yapma & Realize Edilen Kâr/Zarar Kaydı
    public func executeSell(holdingId: UUID, saleQty: Double, salePrice: Double, saleDate: Date = Date()) -> Bool {
        guard let index = holdings.firstIndex(where: { $0.id == holdingId }) else { return false }
        let current = holdings[index]
        
        guard saleQty <= current.quantity else { return false }
        
        let saleRecord = SaleRecord(
            symbol: current.symbol,
            name: current.name,
            category: current.category,
            saleDate: saleDate,
            saleQty: saleQty,
            salePrice: salePrice,
            costBasisAtSale: current.avgCost
        )
        
        sales.insert(saleRecord, at: 0)
        
        let remainingQty = current.quantity - saleQty
        if remainingQty <= 0.000001 {
            holdings.remove(at: index)
        } else {
            holdings[index] = PortfolioHolding(
                id: current.id,
                symbol: current.symbol,
                name: current.name,
                category: current.category,
                quantity: remainingQty,
                avgCost: current.avgCost, // Ortalama maliyet satışta değişmez
                currentPrice: current.currentPrice,
                previousClosePrice: current.previousClosePrice,
                transactions: current.transactions
            )
        }
        
        return true
    }
    
    // Total Net Asset Value
    public var totalNAV: Double {
        holdings.reduce(0.0) { $0 + $1.marketValue }
    }
    
    // Total Cost Basis
    public var totalCost: Double {
        holdings.reduce(0.0) { $0 + $1.totalCost }
    }
    
    // Total Unrealized Gain / Loss
    public var totalUnrealizedPL: Double {
        totalNAV - totalCost
    }
    
    // Total Realized Gain / Loss from Sales
    public var totalRealizedPL: Double {
        sales.reduce(0.0) { $0 + $1.realizedPL }
    }
    
    // Daily Gain / Loss
    public var dailyPL: Double {
        holdings.reduce(0.0) { $0 + $1.dailyPL }
    }
}
