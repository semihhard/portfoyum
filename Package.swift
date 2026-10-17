// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Portfoyum",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .executable(name: "Portfoyum", targets: ["Portfoyum"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "Portfoyum",
            dependencies: [],
            path: "Sources/Portfoyum"
        )
    ]
)
