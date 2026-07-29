# Storage Export Validation

## Metadata-only findings

| Account | Important content | Metadata count/size | Export status | Classification |
|---|---|---:|---|---|
| `stasoradsrdev` | `dsr-exports` | 0 blobs / 0 bytes; all four queues report 0 | Not exported | Privacy-critical metadata retained; Cosmos records still blocked |
| `asoramediadev` | `user-media` | 0 blobs / 0 bytes | No content export required from live count | No live media found; retain metadata proof |
| `asorapsqlflex8fa9` | Function package/system containers | 0 blobs in observed containers | Not exported | Rebuild/deployment support; webjobs secrets not retrieved |
| `asoraflexdev1404` | Deployment/system containers | `deployments`: 54 blobs / 1,942,880,009 bytes; webjobs secrets: 152 blobs / 80,616 bytes | Not exported | Deployment artifacts are operational; webjobs secrets are sensitive |

No blob bodies, queue bodies, media, deployment packages, or webjobs secret contents were exported. Codex workspace storage is not an approved data vault.

`deployments` may be reproducible from source but must not be deleted without owner confirmation. `azure-webjobs-secrets` is not disposable by inference; it requires approved encrypted preservation or a documented secure regeneration decision.

Final status: **BLOCKED — export destinations and preservation decisions are missing.**
