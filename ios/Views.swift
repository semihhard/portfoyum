//
//  Views.swift
//  iOS Portföy Takip Uygulaması
//
//  Created for Antigravity iOS App Plan
//

import SwiftUI

// MARK: - Main Tab View
public struct MainTabView: View {
    @StateObject private var calculator = PortfolioCalculator()
    
    public init() {}
    
    public var body: some View {
        TabView {
            DashboardView()
                .environmentObject(calculator)
                .tabItem {
                    Label("Portföy", systemImage: "chart.pie.fill")
                }
            
            SalesHistoryView()
                .environmentObject(calculator)
                .tabItem {
                    Label("Satışlar", systemImage: "receipt.fill")
                }
        }
        .accentColor(Color.blue)
    }
}

// MARK: - Portfolio Dashboard View
public struct DashboardView: View {
    @EnvironmentObject var calculator: PortfolioCalculator
    @State private var showingAddModal = false
    @State private var selectedHoldingToSell: PortfolioHolding? = nil
    
    public init() {}
    
    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Summary Hero Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Toplam Portföy Değeri")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                        
                        Text(calculator.totalNAV, format: .currency(code: "TRY"))
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                        
                        HStack(spacing: 12) {
                            VStack(alignment: .leading) {
                                Text("Günlük Kâr / Zarar")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(calculator.dailyPL, format: .currency(code: "TRY"))
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                                    .foregroundColor(calculator.dailyPL >= 0 ? .green : .red)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing) {
                                Text("Toplam Kâr / Zarar")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(calculator.totalUnrealizedPL, format: .currency(code: "TRY"))
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                                    .foregroundColor(calculator.totalUnrealizedPL >= 0 ? .green : .red)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        
                        HStack {
                            Text("Realize Edilen Kâr:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(calculator.totalRealizedPL, format: .currency(code: "TRY"))
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.08), radius: 10, x: 0, y: 4)
                    .padding(.horizontal)
                    
                    // Holdings List Header
                    HStack {
                        Text("Varlıklarım (\(calculator.holdings.count))")
                            .font(.headline)
                        Spacer()
                    }
                    .padding(.horizontal)
                    
                    // Holdings Row List
                    LazyVStack(spacing: 12) {
                        ForEach(calculator.holdings) { holding in
                            HoldingRowView(holding: holding) {
                                selectedHoldingToSell = holding
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Portföyüm")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddModal = true }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showingAddModal) {
                AddTransactionView()
                    .environmentObject(calculator)
            }
            .sheet(item: $selectedHoldingToSell) { holding in
                SellAssetView(holding: holding)
                    .environmentObject(calculator)
            }
        }
    }
}

// MARK: - Holding Row View Component
struct HoldingRowView: View {
    let holding: PortfolioHolding
    let onSellTap: () -> Void
    
    var body: some View {
        HStack {
            Image(systemName: holding.category.iconName)
                .font(.title2)
                .frame(width: 44, height: 44)
                .background(Color.blue.opacity(0.15))
                .foregroundColor(.blue)
                .cornerRadius(12)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(holding.symbol)
                    .font(.headline)
                Text("\(holding.quantity, specifier: "%.2f") Adet • Ort: \(holding.avgCost, format: .currency(code: "TRY"))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(holding.marketValue, format: .currency(code: "TRY"))
                    .font(.subheadline)
                    .fontWeight(.bold)
                
                Text(holding.unrealizedPL, format: .currency(code: "TRY"))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(holding.unrealizedPL >= 0 ? .green : .red)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .contextMenu {
            Button(action: onSellTap) {
                Label("Satış Yap", systemImage: "hand.holding.dollar")
            }
        }
    }
}

// MARK: - Sales History View with Top 3 Podium & What-If Analysis
public struct SalesHistoryView: View {
    @EnvironmentObject var calculator: PortfolioCalculator
    
    public init() {}
    
    var top3Sales: [SaleRecord] {
        Array(calculator.sales.sorted(by: { $0.realizedPL > $1.realizedPL }).prefix(3))
    }
    
    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Top 3 Podium Section
                    if !top3Sales.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("🏆 En Yüksek Kâr Eden 3 Satış")
                                .font(.headline)
                            
                            ForEach(Array(top3Sales.enumerated()), id: \.element.id) { index, sale in
                                HStack {
                                    Text("\(index + 1)")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .frame(width: 24, height: 24)
                                        .background(index == 0 ? Color.yellow : (index == 1 ? Color.gray : Color.orange))
                                        .foregroundColor(.black)
                                        .clipShape(Circle())
                                    
                                    VStack(alignment: .leading) {
                                        Text(sale.symbol)
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                        Text(sale.saleDate, style: .date)
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Text(sale.realizedPL, format: .currency(code: "TRY"))
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.green)
                                }
                                .padding()
                                .background(Color(.secondarySystemBackground))
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    Text("Satış Arşivi & Satılmasaydı Analizi")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    LazyVStack(spacing: 12) {
                        ForEach(calculator.sales) { sale in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(sale.symbol)
                                        .font(.headline)
                                    Spacer()
                                    Text(sale.saleDate, style: .date)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                HStack {
                                    Text("Satış: \(sale.saleQty, specifier: "%.2f") Adet @ \(sale.salePrice, format: .currency(code: "TRY"))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Spacer()
                                    Text("Realize: \(sale.realizedPL, format: .currency(code: "TRY"))")
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundColor(sale.realizedPL >= 0 ? .green : .red)
                                }
                                
                                // What-If Banner Placeholder logic
                                HStack {
                                    Image(systemName: "info.circle")
                                    Text("Satılmasaydı analizi canlı piyasa fiyatıyla eşleştirilmektedir.")
                                }
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .padding(8)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(16)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Satış Geçmişi")
        }
    }
}

// MARK: - Add Transaction View Sheet
public struct AddTransactionView: View {
    @EnvironmentObject var calculator: PortfolioCalculator
    @Environment(\.presentationMode) var presentationMode
    
    @State private var category: AssetCategory = .stock
    @State private var symbol: String = ""
    @State private var name: String = ""
    @State private var quantity: String = ""
    @State private var price: String = ""
    
    public init() {}
    
    public var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Varlık Bilgileri")) {
                    Picker("Varlık Türü", selection: $category) {
                        ForEach(AssetCategory.allCases) { cat in
                            Text(cat.displayName).tag(cat)
                        }
                    }
                    
                    TextField("Sembol (Örn: THYAO, BTC)", text: $symbol)
                    TextField("Açıklama (İsteğe bağlı)", text: $name)
                }
                
                Section(header: Text("Alım Detayları")) {
                    TextField("Adet Miktarı", text: $quantity)
                        .keyboardType(.decimalPad)
                    TextField("Birim Alış Fiyatı (TL)", text: $price)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle("Varlık Ekle")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("İptal") { presentationMode.wrappedValue.dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kaydet") {
                        if let q = Double(quantity), let p = Double(price), !symbol.isEmpty {
                            calculator.addBuy(symbol: symbol, name: name, category: category, quantity: q, price: p)
                            presentationMode.wrappedValue.dismiss()
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Sell Asset View Sheet
public struct SellAssetView: View {
    let holding: PortfolioHolding
    @EnvironmentObject var calculator: PortfolioCalculator
    @Environment(\.presentationMode) var presentationMode
    
    @State private var saleQty: String = ""
    @State private var salePrice: String = ""
    
    public var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Mevcut Durum")) {
                    Text("Varlık: \(holding.symbol) - \(holding.name)")
                    Text("Mevcut Adet: \(holding.quantity, specifier: "%.2f")")
                    Text("Ort. Maliyet: \(holding.avgCost, format: .currency(code: "TRY"))")
                }
                
                Section(header: Text("Satış Detayları")) {
                    TextField("Satılacak Adet", text: $saleQty)
                        .keyboardType(.decimalPad)
                    TextField("Birim Satış Fiyatı (TL)", text: $salePrice)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle("Varlık Sat")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Vazgeç") { presentationMode.wrappedValue.dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Satışı Onayla") {
                        if let q = Double(saleQty), let p = Double(salePrice) {
                            _ = calculator.executeSell(holdingId: holding.id, saleQty: q, salePrice: p)
                            presentationMode.wrappedValue.dismiss()
                        }
                    }
                }
            }
        }
    }
}
