# Test Implementation Plan: FileIngestAgent

**Goal:** Create a module to ingest an external file (path) into the current project folder.
**Source Document:** `MODULE_INTEGRATION.md` (v2.0)

## 1. Module Architecture (Per Section 1)
*   **Agent Name:** `FileIngestAgent`
*   **Type:** In-Process Python Class.
*   **File:** `backend/file_ingest_agent.py`
*   **Return Pattern:** Simple return types (`True` / `str` / `None`). No Envelopes.

## 2. Implementation Specs

### 2.1 The Agent Class (`backend/file_ingest_agent.py`)
Following "Hello Module" pattern:
*   **Init:** No special init needed, but good to have `self` state if needed.
*   **Method:** `async def ingest_file(self, source_path: str, target_name: str) -> str`
*   **Logic:**
    1.  **Validation (Section 3.2):**
        *   Get Root: `project_manager.get_current_project_path()`.
        *   Target Path: Resolve `root / target_name`.
        *   **Check:** Verify `target_path` starts with `root`.
        *   *Self-Correction:* Blueprint says validate *manually*.
    2.  **Risk (Section 2.1):**
        *   This is a **HIGH** risk tool (Writing files).
        *   **Requirement:** Check `config.ENABLE_HIGH_RISK`. If false -> Return Error String.
    3.  **Action:**
        *   `shutil.copy(source_path, target_path)`
    4.  **Error Handling (Section 3):**
        *   `try...except` wrapper.
        *   On error: Print log, return `None` or Error String.

### 2.2 Schema Registration (Per Section 2.2)
*   **File:** `backend/tools.py` (Central file #1).
*   **Definition:**
    ```python
    ingest_file_tool = {
        "name": "ingest_file",
        "description": "Copies an external file into the project workspace.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "source_path": {"type": "STRING", "description": "Absolute path to source file"},
                "target_name": {"type": "STRING", "description": "Destination filename"}
            },
            "required": ["source_path", "target_name"]
        },
        # Metadata per Section 2.1
        "metadata": {
            "risk": "high",
            "timeout": 10000
        }
    }
    # Append to tools_list
    ```

### 2.3 Integration (Per Section 2.1 & 2.3)
*   **File:** `backend/lexi.py` (Central file #2 - Technical Debt).
*   **Changes:**
    1.  **Import:** `from file_ingest_agent import FileIngestAgent`
    2.  **Init:** `self.file_ingest = FileIngestAgent()`
    3.  **Dispatch Loop:**
        ```python
        elif fc.name == "ingest_file":
            res = await self.file_ingest.ingest_file(fc.args["source_path"], fc.args["target_name"])
            # Format simple response
            response_str = f"File swallowed: {res}" if res else "Failed to swallow file."
            # Append to function_responses...
        ```

## 3. Compliance Checklist
*   [x] **Structure:** Matches `Legacy Standard`.
*   [x] **Golden Rule:** touches `tools.py` (Schema) and `lexi.py` (Debt).
*   [x] **Safety:** Implements manual path validation.
*   [x] **Guardrails:** Respects High Risk check.

---
**Verdict:** The plan seems solid and achievable using the current codebase capabilities. The constraints in `MODULE_INTEGRATION.md` (Manual Dispatch, Manual Validation) accurately reflect the steps needed to make this work.
