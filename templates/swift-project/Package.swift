// swift-tools-version: 6.1

import PackageDescription

// The Swift SDK lives at `bindings/swift` in the panproto repository,
// and SwiftPM resolves a package URL by cloning and looking for a
// `Package.swift` at the root, with no subpath option. Each release
// therefore mirrors that directory to `panproto/panproto-swift`, tagged
// with the same version as the engine, and that mirror is what a
// consumer depends on.
//
// The mirrored manifest pins the `panproto_c.xcframework` published for
// its own tag, so resolving this package downloads the prebuilt C
// library along with the Swift sources. Nothing needs Rust, and nothing
// needs a workspace checkout. That artifact is 356 MB for 0.71.0, so
// the first resolve is slow and every later one is cached.

let package = Package(
    name: "my-panproto-app",
    // The SDK declares these floors, and they are not optional here.
    // A consumer that omits them still resolves, then fails when the
    // build graph is planned: "requires macos 10.13, but depends on
    // the product 'Panproto' which requires macos 14.0".
    platforms: [
        .macOS(.v14),
        .iOS(.v17),
    ],
    dependencies: [
        // Up to the next minor, not the next major. panproto is pre-1.0
        // and breaks its API across minors, and each tag's manifest pins
        // its own XCFramework, so `from:` would move the Swift surface
        // and the engine under you at once.
        .package(
            url: "https://github.com/panproto/panproto-swift.git",
            .upToNextMinor(from: "0.71.0")
        )
    ],
    targets: [
        .executableTarget(
            name: "MyPanprotoApp",
            dependencies: [
                // The engine-backed core: protocols, schemas, instances,
                // I/O codecs, compatibility checking, migrations, lenses,
                // expressions, theories, homomorphism search, datasets.
                .product(name: "Panproto", package: "panproto-swift"),
                // The pure value layer the core hands back and takes:
                // `Schema`, `Vertex`, `Edge`, `SchemaSpan`, and the rest.
                // No engine, no FFI.
                .product(name: "PanprotoStructural", package: "panproto-swift"),
            ]
        )
    ]
)

// `package:` above is the package *identity*, which SwiftPM takes from
// the last component of the URL. It is `panproto-swift` even though the
// mirrored manifest still calls itself `panproto`; writing `panproto`
// here gets "unknown package 'panproto' in dependencies of target
// 'MyPanprotoApp'".
//
// No `swiftLanguageModes:` line: a manifest at tools-version 6.1
// already compiles in Swift 6 language mode, which is the mode the
// SDK's global actor needs to be load-bearing. Declaring `[.v6]` here
// changes nothing.

// Four further products are available from the same package:
//
//     PanprotoVcs       schematic version control
//     PanprotoParse     full-AST source parsing, feature-gated
//     PanprotoProject   multi-file project assembly, feature-gated
//     PanprotoGit       the git bridge, feature-gated
//
// The three gated products always exist in the package graph, so a
// build that does not ask for them still resolves; their modules are
// empty unless the linked library was built with the matching cargo
// feature and the build names the matching package trait. The trait is
// spelled in upper snake case rather than after the product:
//
//     swift build --traits PANPROTO_PARSE,PANPROTO_PROJECT,PANPROTO_GIT
//
// Naming a trait the linked library lacks fails at link time rather
// than at resolve. The release pin above is the default XCFramework,
// built without those three cargo features, so a project on the
// published dependency can add `PanprotoVcs` and nothing beyond it.
