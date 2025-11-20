# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-20

### Added ✨

#### Core Features
- **Prompts System** - 6 guided analysis workflows:
  - `analyze_municipality` - Comprehensive municipality analysis
  - `compare_municipalities` - Multi-municipality comparisons
  - `trend_analysis` - Historical trend analysis
  - `find_schools` - School discovery and analysis
  - `regional_comparison` - Regional performance comparisons
  - `kpi_discovery` - KPI exploration and discovery

#### Performance
- **Caching System** - In-memory cache with configurable TTL:
  - 24-hour cache for municipalities and KPI catalog
  - Automatic cache cleanup and expiration
  - Cache statistics endpoint in health check
  - Reduces API calls by up to 90% for repeated queries

#### Error Handling
- **MCP Error Codes** - Standardized error handling:
  - Proper MCP error codes (InvalidRequest, InvalidParams, InternalError)
  - Input validation (KPI IDs, municipality IDs, OU IDs)
  - Batch size validation
  - Helpful error messages with suggestions
  - Context-aware error reporting

#### Testing
- **Unit Tests** - Comprehensive test coverage:
  - Cache functionality tests
  - Error handling tests
  - Prompt generation tests
  - All tests pass with Vitest

### Changed 🔄

- Upgraded version to 2.0.0
- Enhanced tool descriptions for better AI understanding
- Improved resource handlers with caching
- Better error messages across all tools

### Fixed 🐛

- Input validation now catches invalid IDs before API calls
- Proper handling of 404 responses from Kolada API
- Rate limiting errors now handled gracefully
- Cache expiration now works correctly

### Technical Improvements 🔧

- Added TypeScript utilities for error handling
- Implemented singleton cache pattern
- Added cache key generation utilities
- Improved API client error handling
- Better logging throughout the application

## [1.0.0] - 2024-12-XX

### Added
- Initial release
- 16 tools for Kolada API access
- 3 resources (municipalities, KPI catalog, API info)
- Dual transport support (stdio + HTTP/SSE)
- Rate limiting and retry logic
- TypeScript support
- Documentation and examples

[2.0.0]: https://github.com/KSAklfszf921/kolada-mcp-server/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/KSAklfszf921/kolada-mcp-server/releases/tag/v1.0.0
