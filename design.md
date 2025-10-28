Project: Cloud Run LLM Manager

## 1. Objective

**Problem:** Deploying and managing open-source Large Language Models (LLMs) on Google Cloud Run with GPUs is a complex, multi-step process. It requires deep manual configuration of GCS for model storage, IAM for permissions, and the Cloud Run service itself (selecting the right serving framework like Ollama or vLLM, configuring GCS mounts, selecting the correct GPU, and setting environment variables).

**Solution:** This project is a self-contained Next.js application, deployable as a single Cloud Run container, that provides a simple UI (with "General", "Models", and "Services" tabs) and a backend API to abstract and streamline this entire lifecycle. It will act as a "control plane" or "manager" to help users easily download, deploy, and monitor their LLM services on Cloud Run.

## 2. Core Application Tabs & User Journeys (CUJs)

### CUJ 1: "General" Tab - Global Configuration & Project Setup

**Goal:** To provide a central place for one-time setup and to validate that the project and the manager application have the correct permissions and configuration to operate.

**UI:**

*   A "General" settings page with a card-based layout.
*   **Application Identity Card:** Displays the identity (user or service account email) being used by the application to authenticate with Google Cloud APIs, determined via Application Default Credentials (ADC).
*   **Project Selector Card:** A component with two states:
    *   **Selected State:** Shows the currently selected project's name and ID with a success icon, and a "Change" button. This is the default view if a project is saved in local storage.
    *   **Editing State:** Shown when the user clicks "Change" or if no project is selected. Contains a search box to filter projects and a list/dropdown to select a project. A "Confirm" button saves the selection.
*   **Configuration Status Card:** A card with a checklist showing the status of Manager App Permissions, Project Billing, and Networking.

**Functionality:**

*   **Project Selection:** Allows the user to specify which project to operate against.
    *   The backend provides an API to list projects the current identity can see. For performance with large numbers of projects, a debounced server-side search filters the list as the user types.
    *   If the identity lacks `resourcemanager.projects.list` permission, the UI gracefully degrades, prompting the user to enter a project ID manually.
    *   The selected project ID is persisted in the browser's local storage, so the user's selection is remembered across sessions. On page load, the application fetches the details for the saved project to display its name.
    *   The selected project's name is also displayed in the main header bar.
*   **Manager App Permission Check:**
    *   The backend will perform a `testIamPermissions` check for its own service account.
    *   It will verify the permissions listed in Section 3. Technical Architecture (e.g., `run.services.create`, `storage.buckets.create`, `iam.serviceAccounts.setIamPolicy`).
    *   The UI will show a checklist: `[✓] Cloud Run Admin`, `[✗] GCS Admin`, `[✓] IAM Admin`.
    *   It will provide a `gcloud` command or a link to the IAM console for the user to grant the missing permissions.
*   **Project Billing Check:**
    *   The backend will use the Cloud Billing API to check if billing is enabled for the selected project.
    *   The UI will display: "Billing Status: Enabled" or "Billing Status: Not Found/Disabled".
*   **Networking Configuration:**
    *   The UI will check if a Serverless VPC Access connector is configured for the project's region.
    *   It will recommend setting one up for faster GCS access (Direct VPC).
    *   It will provide a deep link to the VPC Network console to create a new connector.
    *   It will allow the user to select an existing connector to be used as a default for all future LLM service deployments (setting the `--vpc-connector` flag).

### CUJ 2: "Models" Tab - Model Management & Preparation

**Goal:** To provide a central interface for discovering, downloading, and managing LLM model files within Google Cloud Storage, preparing them for deployment.

**UI:**

*   A "Models" tab displaying a list of GCS buckets that have been designated for model storage.
*   For each bucket, the UI will show its region and a list of the models stored within it, read from a custom metadata file.
*   Each model entry will display its name, source (Hugging Face/Ollama), size, and download status.
*   An "Import Model" button that opens a unified view for importing.
*   A real-time progress indicator for ongoing model downloads, showing percentage complete, files downloaded, and ETA.

**Bucket and Model Discovery:**

*   The application will identify GCS buckets managed by the LLM Manager by searching for a specific metadata file (e.g., `llm-manager-metadata.json`) in the root of each bucket. This prevents interference with other GCS buckets in the project.
*   This JSON file will contain a list of models, their metadata (source, size, original repository ID), and download status.

**Functionality: Import Model View**

*   **Target Bucket:**
    *   The user can select an existing GCS bucket or choose to create a new one.
*   **Model Source & Details:**
    *   The user selects the model source via a side-by-side card layout that explains the trade-offs:
        *   **Hugging Face (vLLM):** Slower cold starts, but better performance for high-traffic use cases.
        *   **Ollama:** Fast cold start and fast single-user performance.
    *   The user enters the model identifier (e.g., `meta-llama/Meta-Llama-3-8B` for Hugging Face, `gemma2:9b` for Ollama).
    *   For Hugging Face, an optional field for an `HF_TOKEN` is provided for accessing gated models.
*   **Pre-flight Check & Confirmation:**
    *   Before starting the download, the backend makes a request to the model source's API.
    *   This "pre-flight" check validates the model's existence, confirms the HF token is valid (if provided), and fetches metadata, including the model's total size and a list of files to be downloaded.
    *   The UI displays this information to the user for confirmation.
*   **Download & Monitoring:**
    *   Upon confirmation, the download process begins.
    *   The UI shows a detailed progress view: a list of all files to be downloaded, with a progress bar for each individual file and an overall progress bar for the entire model. It will also provide an estimated time remaining (ETA).

**Backend Implementation:**

*   **Bucket Management APIs (`/api/models/buckets`):**
    *   `GET`: Lists all GCS buckets in the project and checks for the `llm-manager-metadata.json` file to identify which ones to display.
    *   `POST`: Creates a new GCS bucket in the specified region and initializes it with an empty `llm-manager-metadata.json` file.
*   **Model Import APIs (`/api/models/import`):**
    *   The backend includes separate API routes for Hugging Face (`/api/models/import/*`) and Ollama (`/api/models/import/ollama/*`).
    *   **Pre-flight:** Contacts the external model hub (Hugging Face Hub or Ollama OCI Registry) to get metadata, file lists, and total size.
    *   **Start:** This is the main download endpoint.
        *   It streams files directly from the source to a temporary location in the target GCS bucket.
        *   For Ollama, it creates the specific OCI-compliant directory structure (`/blobs/sha256-<hash>`) required by the Ollama container.
        *   It uses Server-Sent Events (SSE) to stream real-time progress updates back to the frontend.
        *   Upon successful download, it updates the `llm-manager-metadata.json` file in the bucket.
*   **Permission Management:**
    *   When a model is selected for deployment (in CUJ 3), the system will verify that the Cloud Run service's identity has `Storage Object Viewer` permissions on the model's GCS bucket.
    *   The UI will offer a one-click "Grant Access" button to simplify this IAM binding.

### CUJ 3: "Services" Tab - Service Deployment & Management

**Goal:** To deploy new LLM services using pre-downloaded models and to provide a dashboard for managing all services deployed by this tool.

**UI:**

*   **Models Tab Integration:** A "Deploy" button will appear next to each successfully downloaded model in the "Models" tab (CUJ 2).
*   **Deploy Service View:** Clicking "Deploy" navigates to a new, dedicated view for service configuration with a card-based layout.
*   **Services Dashboard:** The main view of the "Services" tab, which lists all Cloud Run services that have the `managed-by: llm-manager` label.

**Functionality 1: Deploy New vLLM Service (Hugging Face)**

This workflow begins when the user clicks the "Deploy" button for a Hugging Face model.

*   **UI: Deploy Service View**
    *   The view is pre-filled with default configurations for a vLLM deployment.
    *   **Container Image:** Defaults to `vllm/vllm-openai`.
    *   **Container Port:** Defaults to `8000`.
    *   **Container Arguments:** Pre-filled with vLLM defaults (`--model`, `--tensor-parallel-size`, etc.).
    *   **Environment Variables:** Pre-filled with `HF_HUB_OFFLINE=1`.

**Functionality 2: Deploy New Ollama Service**

This workflow begins when the user clicks the "Deploy" button for an Ollama model.

*   **UI: Deploy Service View**
    *   The view is pre-filled with default configurations for an Ollama deployment.
    *   **Container Image:** Defaults to `ollama/ollama`.
    *   **Container Port:** Defaults to `11434`.
    *   **Container Arguments:** Cleared, as they are not used.
    *   **Environment Variables:** Pre-filled with Ollama defaults:
        *   `OLLAMA_MODELS` = `/gcs/[bucket-name]/ollama`
        *   `MODEL` = `[model-id]` (e.g., `gemma2:9b`)
        *   `OLLAMA_DEBUG` = `false`
        *   `OLLAMA_KEEP_ALIVE` = `-1`

**Backend API (`/api/services/deploy`):**

*   Receives the full service configuration from the UI, regardless of the source.
*   Uses the Cloud Run Admin API to create and deploy the new service.
*   **GCS FUSE Mount:** Constructs the necessary `volumes` and `volumeMounts` configuration to mount the GCS bucket.
*   **Labels:** Adds a `managed-by: llm-manager` label to the service for tracking.
*   The API streams back deployment progress and status updates to the frontend.

**Functionality 3: View & Manage Deployed Services (Dashboard)**

*   **Table Columns:** Service Name, Status (Deploying, Ready, Error), Endpoint URL, Deployed Model, Framework (vLLM/Ollama), GPU Type.
*   **Actions (per service):**
    *   **Delete:** A button to delete the service (with confirmation).
    *   **Deep Links:** Links to the Cloud Console for Logs, Service Management, and Metrics.
*   **Backend API (`/api/services/list`, `/api/services/delete`):**
    *   Uses the Cloud Run Admin API to `list()` and `delete()` services, filtering by the `managed-by: llm-manager` label.

## 3. Technical Architecture

*   **Framework:** Next.js (App Router).
*   **Frontend:** React, using Tailwind CSS for styling.
*   **Backend:** Next.js API Routes.
*   **Deployment:** The entire application is packaged into a single Docker container and deployed on Cloud Run.
*   **State:** The application is stateless. All information is read directly from the Google Cloud APIs (GCS, Cloud Run) on demand.
*   **Authentication & Permissions:**
    *   **Application Authentication:** The backend authenticates to Google Cloud APIs using Application Default Credentials (ADC).
    *   **User Access:** The manager UI itself should be secured, ideally using Identity-Aware Proxy (IAP).
    *   **Service Identity:** The manager's service account requires permissions to manage Cloud Run, GCS, and IAM policies.

## 4. UI/UX Guidelines

*   **Look & Feel:** Emulate the Google Cloud Run console.
*   **Theme:** Use Google's standard color palette, fonts, and component styles.
*   **Components:** Utilize clean tables, simple forms, modals, and consistent button styling.
*   **Feedback:** Provide clear loading indicators and toast/inline notifications for success or error states.