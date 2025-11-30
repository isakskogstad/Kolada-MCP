# MCP Registry Publishing Checklist

Use this checklist to ensure your Kolada MCP Server is ready for registry submission.

## Pre-Submission Validation

### Configuration Files

- [x] **server.json** exists at project root
- [x] **server.json** includes correct schema reference
- [x] **server.json** has valid namespace: `io.github.isakskogstad/kolada-mcp`
- [x] **server.json** version matches package.json: `2.2.1`
- [x] **server.json** includes icon URL
- [x] **package.json** has mcpName field matching server.json name
- [x] **package.json** includes comprehensive keywords

### NPM Package

- [x] **Package published** to NPM: `kolada-mcp-server@2.2.1`
- [x] **Package is public** (not scoped or private)
- [x] **Package includes bin** entries for both stdio and HTTP modes
- [x] **Package has MIT license**
- [x] **Package description** is clear and concise
- [x] **Package keywords** include mcp, model-context-protocol

### GitHub Repository

- [x] **Repository is public**
- [x] **Repository has MIT license** file
- [x] **README.md** is comprehensive with:
  - [x] Clear description
  - [x] Installation instructions
  - [x] Configuration examples
  - [x] Usage examples
  - [x] Tool documentation
  - [x] Remote endpoint URLs
- [x] **Repository has topics/tags**: mcp, model-context-protocol, kolada
- [x] **Repository URL** matches server.json

### Remote Endpoints

- [x] **HTTP endpoint** accessible: https://kolada-mcp-pafn.onrender.com/mcp
- [x] **SSE endpoint** accessible: https://kolada-mcp-pafn.onrender.com/sse
- [x] **Health endpoint** responding: https://kolada-mcp-pafn.onrender.com/health
- [x] **Endpoints are stable** (deployed on Render)
- [x] **Endpoints have proper CORS** headers

### Documentation

- [x] **README** in both Swedish and English
- [x] **Tool descriptions** clear and accurate
- [x] **Example queries** provided
- [x] **Configuration examples** for multiple clients:
  - [x] Claude Desktop
  - [x] Claude Web
  - [x] Claude Code CLI
  - [x] ChatGPT
  - [x] Other MCP clients
- [x] **Data attribution** noted ("Source: Kolada")

### Testing

- [x] **NPM package installation** tested: `npx kolada-mcp-server`
- [x] **Stdio transport** working
- [x] **HTTP transport** working
- [x] **SSE transport** working
- [x] **All tools** tested and functioning
- [x] **Error handling** implemented
- [x] **Rate limiting** respected

## Submission Preparation

### Automated Validation

- [ ] Run preparation script: `./scripts/prepare-mcp-submission.sh`
- [ ] All validation checks pass
- [ ] No version mismatches
- [ ] No endpoint errors

### GitHub Actions

- [ ] Workflow file exists: `.github/workflows/mcp-registry-publish.yml`
- [ ] Workflow can be triggered manually
- [ ] Workflow validates schema
- [ ] Workflow checks version consistency
- [ ] Workflow tests endpoints

## Submission Options

### Option A: Automated (GitHub Actions)

- [ ] Decide on trigger method (tag or manual)
- [ ] Create git tag: `v2.2.1`
- [ ] Push tag to GitHub
- [ ] Monitor workflow execution
- [ ] Download artifacts if needed
- [ ] Review workflow output

### Option B: Manual Submission

- [ ] Fork MCP servers repository
- [ ] Clone fork locally
- [ ] Create submission branch: `add-kolada-mcp`
- [ ] Create directory: `src/servers/io.github.isakskogstad/`
- [ ] Copy server.json to correct location
- [ ] Commit with descriptive message
- [ ] Push to fork
- [ ] Create pull request
- [ ] Fill PR description completely
- [ ] Submit PR

## Pull Request Requirements

### PR Content

- [ ] **Title** clear and descriptive: "Add Kolada MCP Server"
- [ ] **Description** includes:
  - [ ] Server overview
  - [ ] Feature list
  - [ ] Transport options
  - [ ] Testing confirmation
  - [ ] Additional context
- [ ] **Files changed** only includes server.json
- [ ] **No merge conflicts**
- [ ] **All CI checks** passing

### PR Checklist Items

- [ ] Server name follows convention: `io.github.username/package-name`
- [ ] Schema version is latest: `2025-10-17`
- [ ] NPM package is public and accessible
- [ ] Remote endpoints are operational
- [ ] Repository is public with license
- [ ] README has complete documentation
- [ ] All metadata is accurate

## Post-Submission

### Monitoring

- [ ] PR created successfully
- [ ] CI/CD checks started
- [ ] All automated checks passing
- [ ] No reviewer comments/requests
- [ ] Waiting for maintainer review

### Response Management

- [ ] Respond to review comments within 48 hours
- [ ] Make requested changes promptly
- [ ] Update PR with changes
- [ ] Re-request review after updates

### After Approval

- [ ] PR merged successfully
- [ ] Server appears in registry
- [ ] Registry listing looks correct
- [ ] Icon displays properly
- [ ] All endpoints listed correctly

## Post-Publication

### Updates

- [ ] Update README.md with registry link
- [ ] Add MCP Registry badge
- [ ] Update package.json description if needed
- [ ] Announce on social media/blog (optional)

### Registry Verification

- [ ] Search for "kolada" in registry
- [ ] Server appears in results
- [ ] Server details are accurate
- [ ] Icon displays correctly
- [ ] Links work properly

### Client Testing

Test installation via registry in:
- [ ] Claude Desktop
- [ ] Claude Web
- [ ] Claude Code CLI
- [ ] ChatGPT (if supported)
- [ ] Other MCP clients

## Maintenance

### Version Updates

When publishing new versions:
- [ ] Update package.json version
- [ ] Update server.json version
- [ ] Publish to NPM
- [ ] Test new version
- [ ] Create PR to update server.json in registry
- [ ] Follow same submission process

### Endpoint Changes

If remote endpoints change:
- [ ] Update server.json with new URLs
- [ ] Test new endpoints thoroughly
- [ ] Create PR to update registry
- [ ] Notify users of change

## Troubleshooting Reference

### Common Issues

| Issue | Solution |
|-------|----------|
| Version mismatch | Update both package.json and server.json to same version |
| Schema validation failed | Check server.json against schema, fix errors |
| NPM package not found | Publish package to NPM first |
| Endpoint not accessible | Check Render deployment, restart if needed |
| CI checks failing | Review error logs, fix issues, push updates |

### Support Resources

- MCP Registry: https://github.com/modelcontextprotocol/servers/issues
- Kolada MCP: https://github.com/isakskogstad/kolada-mcp/issues
- MCP Docs: https://modelcontextprotocol.io/

## Final Checklist

Before clicking "Create Pull Request":

- [ ] All validation checks passed
- [ ] PR description is complete
- [ ] No obvious errors in server.json
- [ ] Tested at least one transport method
- [ ] Ready to respond to review feedback
- [ ] Confident in submission quality

## Status Tracking

| Stage | Status | Date |
|-------|--------|------|
| Pre-submission validation | ⏳ Pending | - |
| GitHub Actions workflow | ⏳ Pending | - |
| Fork & branch creation | ⏳ Pending | - |
| Pull request created | ⏳ Pending | - |
| CI checks passing | ⏳ Pending | - |
| Initial review | ⏳ Pending | - |
| Feedback addressed | ⏳ Pending | - |
| Final approval | ⏳ Pending | - |
| Merged to registry | ⏳ Pending | - |
| Verified in registry | ⏳ Pending | - |

**Legend:**
- ⏳ Pending
- 🔄 In Progress
- ✅ Complete
- ❌ Failed/Blocked

---

**Last Updated:** 2025-11-30
**Server Version:** 2.2.1
**Submission Method:** [ ] Automated / [ ] Manual

Good luck with your submission! 🚀
