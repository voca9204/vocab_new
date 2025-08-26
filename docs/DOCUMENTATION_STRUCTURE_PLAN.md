# 📚 Documentation Reorganization Plan
*Created: 2025-08-23*

## 🎯 Current Issues Identified

### Major Conflicts
1. **Multiple Project Overview Files**: README.md, PROJECT_DOCUMENTATION.md, claude_context.md, CLAUDE.md
2. **Architecture Documentation Overlap**: DATABASE_ARCHITECTURE.md, CURRENT_ARCHITECTURE_STATUS.md, structure.md
3. **13 Legacy/Archive Files** scattered across different locations
4. **Inconsistent Naming Conventions** (mix of English/Korean, different date formats)

## 🏗️ New Documentation Architecture

### Level 1: Root Directory (Essential Only)
```
/
├── README.md                          # 🔥 MAIN - Project overview & quick start
├── CLAUDE.md                          # 🔥 KEEP - Claude Code instructions  
├── CLAUDE.local.md                    # 🔒 PRIVATE - User instructions
└── CHANGELOG.md                       # 🆕 NEW - Auto-generated from Git history
```

### Level 2: /docs Directory Structure
```
docs/
├── ARCHITECTURE/                      # 🏛️ System Architecture & Design
│   ├── current-status.md              # ← CURRENT_ARCHITECTURE_STATUS.md
│   ├── database.md                    # ← DATABASE_ARCHITECTURE.md  
│   ├── project-structure.md           # ← structure.md
│   ├── unified-word-system.md         # ← docs/architecture/unified-word-system.md
│   └── design/                        # 📐 Design specifications
│       ├── dynamic-vocabulary/        # Consolidated dynamic vocab docs
│       ├── photo-vocabulary/          # Photo vocab system design  
│       └── user-collections/          # Collection management system
│
├── DEVELOPMENT/                       # 📈 Development History & Logs
│   ├── history.md                     # ← DEVELOPMENT_LOG.md (enhanced)
│   ├── migrations/                    # 🔄 Migration documentation
│   │   ├── summary.md                 # ← MIGRATION_SUMMARY.md
│   │   └── guides/                    # Individual migration guides
│   └── optimizations/                 # Performance improvement records
│       └── phase3-complete.md         # ← docs/PHASE3_OPTIMIZATIONS_COMPLETE.md
│
├── GUIDES/                           # 📖 Developer & User Guides
│   ├── quick-start.md                # ← QUICK_START_GUIDE.md
│   ├── development.md                # New comprehensive dev guide
│   ├── deployment.md                 # ← docs/DEPLOYMENT.md
│   └── troubleshooting.md            # Consolidated problem-solving guide
│
├── REFERENCE/                        # 📚 Technical Reference
│   ├── api/                          # API documentation
│   ├── file-map.md                   # ← FILE_MAP.md
│   └── collections/                  # Collection management docs
│       └── vocabulary-management.md  # ← docs/VOCABULARY_COLLECTION_MANAGEMENT.md
│
├── ARCHIVE/                          # 📦 Historical Documents
│   ├── 2025-q3/                     # Quarterly organization
│   │   ├── project-documentation-old.md  # ← PROJECT_DOCUMENTATION.md
│   │   ├── claude-context-old.md          # ← claude_context.md
│   │   └── improvement-plan-old.md        # ← ARCHITECTURE_IMPROVEMENT_PLAN.md
│   └── legacy-roo/                  # ROO system files
│       └── *.md                     # All .roo/rules/*.md files
│
└── MAINTENANCE/                      # 🔧 Documentation Maintenance
    ├── guidelines.md                 # Documentation standards
    ├── templates/                    # Document templates
    └── review-checklist.md           # Quality assurance
```

## 📋 Document Consolidation Strategy

### Primary Documents (Single Source of Truth)
1. **README.md** - Project overview, features, quick start
2. **docs/ARCHITECTURE/current-status.md** - Current architecture state  
3. **docs/DEVELOPMENT/history.md** - Chronological development log
4. **docs/GUIDES/development.md** - Comprehensive development guide

### Consolidation Actions

#### Architecture Documents → docs/ARCHITECTURE/
- **Merge**: DATABASE_ARCHITECTURE.md + portions of structure.md → database.md
- **Enhance**: CURRENT_ARCHITECTURE_STATUS.md → current-status.md
- **Relocate**: docs/architecture/* → design/ subdirectory

#### Development History → docs/DEVELOPMENT/
- **Enhance**: DEVELOPMENT_LOG.md → history.md (add Git timeline)
- **Organize**: Migration docs → migrations/ subdirectory
- **Archive**: Outdated improvement plans

#### Design Documents → docs/ARCHITECTURE/design/
- **Group**: All dynamic vocabulary docs → dynamic-vocabulary/
- **Group**: Photo vocabulary docs → photo-vocabulary/  
- **Consolidate**: Collection management docs

## 🔄 Migration Plan

### Phase 1: Create New Structure
1. Create directory structure
2. Set up templates and guidelines
3. Create consolidated documents

### Phase 2: Content Migration
1. Merge overlapping content
2. Update cross-references
3. Archive outdated documents

### Phase 3: Validation & Cleanup  
1. Update all internal links
2. Verify no broken references
3. Remove archived originals

## 📏 Quality Standards

### Document Naming Convention
- **English filenames** for consistency
- **kebab-case** format (my-document.md)
- **Descriptive names** indicating content purpose
- **Version indicators** only for archives

### Content Standards
- **Single purpose** per document
- **Clear headers** and table of contents
- **Last updated** timestamp in frontmatter
- **Cross-references** using relative paths
- **Version info** for technical specifications

### Maintenance Process
1. **Weekly Reviews** of active development docs
2. **Monthly Archive** of outdated content  
3. **Quarterly Restructure** if needed
4. **Annual Complete Review** of all documentation

## 🚀 Implementation Timeline

- **Week 1**: Create structure, consolidate core docs
- **Week 2**: Migrate and organize content  
- **Week 3**: Update cross-references, cleanup
- **Week 4**: Establish maintenance processes

## ✅ Success Metrics

- **Reduce** from 50 to ~25 active documentation files
- **Eliminate** all identified content conflicts
- **Standardize** all naming conventions
- **Establish** clear ownership and maintenance processes