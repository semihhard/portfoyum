//
//  PortfolioModels.swift
//  iOS Portföy Takip Uygulaması
//
//  Created for Antigravity iOS App Plan
//

import Foundation

public enum AssetCategory: String, Codable, CaseIterable, Identifiable {
    case stock = "STOCK"
    case fund = "FUND"
    case fx = "FX"
    case crypto = "CRYPTO"
    
    public var id: String { self.rawValue }
    
    public var displayName: String {
        switch self {
        case .stock: return "Hisse"
        case .fund: return "Fon"
        case .fx: return "Döviz / Altın"
        case .crypto: return "Kripto"
        }
    }
    
    public var iconName: String {
        switch self {
        case .stock: return "chart.line.uptrend.xyaxis"
        case .fund: return "building.columns"
        case .fx: return "dollarsign.circle"
        case .crypto: return "bitcoinsign.circle"
        }
    }
}

public struct BuyTransaction: Identifiable, Codable {
    public var id: UUID = UUID()
    public var date: Date
    public var price: Double
    public var quantity: Double
    public var fee: Double
    
    public init(id: UUID = UUID(), date: Date, price: Double, quantity: Double, fee: Double = 0.0) {
        self.id = id
        self.date = date
        self.price = price
        self.quantity = quantity
        self.fee = fee
    }
}

public struct PortfolioHolding: Identifiable, Codable {
    public var id: UUID = UUID()
    public var symbol: String
    public var name: String
    public var category: AssetCategory
    public var quantity: Double
    public var avgCost: Double
    public var currentPrice: Double
    public var previousClosePrice: Double
    public var transactions: [BuyTransaction]
    
    public var marketValue: Double {
        return quantity * currentPrice
    }
    
    public var totalCost: Double {
        return quantity * avgCost
    }
    
    public var unrealizedPL: Double {
        return marketValue - totalCost
    }
    
    public var unrealizedPLPercentage: Double {
        guard totalCost > 0 else { return 0.0 }
        return (unrealizedPL / totalCost) * 100.0
    }
    
    public var dailyPL: Double {
        let prevVal = quantity * previousClosePrice
        return marketValue - prevVal
    }
    
    public init(
        id: UUID = UUID(),
        symbol: String,
        name: String,
        category: AssetCategory,
        quantity: Double,
        avgCost: Double,
        currentPrice: Double,
        previousClosePrice: Double,
        transactions: [BuyTransaction] = []
    ) {
        self.id = id
        self.symbol = symbol
        self.name = name
        self.category = category
        self.quantity = quantity
        self.avgCost = avgCost
        self.currentPrice = currentPrice
        self.previousClosePrice = previousClosePrice
        self.transactions = transactions
    }
}

public struct SaleRecord: Identifiable, Codable {
    public var id: UUID = UUID()
    public var symbol: String
    public var name: String
    public var category: AssetCategory
    public var saleDate: Date
    public var saleQty: Double
    public var salePrice: Double
    public var costBasisAtSale: Double
    public var realizedPL: Double
    public var realizedPLPercent: Double
    
    public init(
        id: UUID = UUID(),
        symbol: String,
        name: String,
        category: AssetCategory,
        saleDate: Date,
        saleQty: Double,
        salePrice: Double,
        costBasisAtSale: Double
    ) {
        self.id = id
        self.symbol = symbol
        self.name = name
        self.category = category
        self.saleDate = saleDate
        self.saleQty = saleQty
        self.salePrice = salePrice
        self.costBasisAtSale = costBasisAtSale
        self.realizedPL = (salePrice - costBasisAtSale) * saleQty
        self.realizedPLPercent = costBasisAtSale > 0 ? ((salePrice - costBasisAtSale) / costBasisAtSale) * 100.0 : 0.0
    }
}
