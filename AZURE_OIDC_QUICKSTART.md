# Azure OIDC Migration - Quick Start

## 🚀 Ready to Migrate? Follow These Steps

### Prerequisites Check

- [ ] You have Azure CLI installed (`az --version`)
- [ ] You have GitHub CLI installed (`gh --version`)
- [ ] You are authenticated to GitHub CLI (`gh auth status`)
- [ ] You have Owner/Contributor access to Azure subscription `99df7ef7-776a-4235-84a4-c77899b2bb04`

### Step-by-Step Instructions

#### 1️⃣ Azure Configuration (2-3 minutes)

Open your terminal and run:

```bash
cd /home/kylee/asora
bash scripts/migrate-to-oidc.sh
```

**What it does:**
- Creates federated credentials for GitHub Actions
- Lists existing client secrets (you'll be prompted to delete them)
- Removes legacy Service Principal access
- Verifies configuration

**Action Required:** When prompted about deleting secrets, type `y` and press Enter.

#### 2️⃣ GitHub Secrets Configuration (1 minute)

In the same terminal, run:

```bash
bash scripts/migrate-github-secrets.sh
```

**What it does:**
- Sets three OIDC secrets (CLIENT_ID, TENANT_ID, SUBSCRIPTION_ID)
- Deletes legacy secrets (CLIENT_SECRET, CREDENTIALS)
- Verifies final state

**No user interaction required** - just watch it work!

#### 3️⃣ Test the Migration (3-5 minutes)

Trigger a test deployment:

```bash
gh workflow run "Deploy Functions (Flex)" --ref main
```

Watch it run:

```bash
gh run watch
```

**Look for:**
- ✅ Green checkmark on "Block legacy SP secrets" step
- ✅ Green checkmark on "Azure login (OIDC)" step
- ✅ Successful deployment

---

## ✅ Success Indicators

After running both scripts, you should see:

### Azure (from `migrate-to-oidc.sh` output)

```
✓ Created federated credential: gha-oidc-repo-AsoraKK-Asora-ref-refs-heads-main
✓ Created federated credential: gha-oidc-repo-AsoraKK-Asora-environment-dev
✓ No client secrets found (good!)
✓ Removed Function App role assignment
✓ Removed Key Vault role assignment
```

### GitHub (from `migrate-github-secrets.sh` output)

```
✓ Set AZURE_CLIENT_ID
✓ Set AZURE_TENANT_ID
✓ Set AZURE_SUBSCRIPTION_ID
✓ Deleted AZURE_CLIENT_SECRET
✓ Deleted AZURE_CREDENTIALS
```

### Workflow Run (from test deployment)

```
✓ Block legacy SP secrets (passed)
✓ Azure login (OIDC) (passed)
✓ Deploy Functions (passed)
✓ E2E Integration Test (passed)
```

---

## ❌ Troubleshooting

### Problem: "az: command not found"

**Solution:** Install Azure CLI:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Problem: "gh: command not found"

**Solution:** Install GitHub CLI:
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Problem: "GitHub CLI is not authenticated"

**Solution:** Authenticate with GitHub:
```bash
gh auth login
```
Follow the prompts to authenticate.

### Problem: Federated credential already exists

**Solution:** This is expected and fine! The script handles this gracefully.

### Problem: Workflow fails with "No matching federated identity record found"

**Solution:** The federated credential subject might not match. Run:
```bash
az ad app federated-credential list --id 06c8564f-030d-414f-a552-678d756f9ec3
```
Verify both subjects are present:
- `repo:AsoraKK/Asora:ref:refs/heads/main`
- `repo:AsoraKK/Asora:environment:dev`

---

## 📱 Manual Alternative (If Scripts Fail)

If you prefer or need to run commands manually, see:
- **Azure commands:** `AZURE_OIDC_MIGRATION_GUIDE.md` (Steps 1-5)
- **GitHub commands:** `AZURE_OIDC_MIGRATION_GUIDE.md` (Steps 6-7)

---

## 🎉 You're Done!

After successful test deployment:
1. ✅ Migration is complete
2. ✅ Workflows now use OIDC (no passwords)
3. ✅ Security posture improved
4. ✅ ADR 002 compliance achieved

**Next Steps:**
- Update team documentation
- Delete this quick start guide
- Archive migration guides for reference

---

**Need Help?** See `AZURE_OIDC_MIGRATION_GUIDE.md` for detailed documentation.
