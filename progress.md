# Development Changelog

## About This File

This document serves as a running changelog to track the progress of the Cloud Run LLM Manager project. Its purpose is to provide a clear and chronological record of implemented features, bug fixes, and significant architectural changes for any developer joining or continuing the project.

### How to Maintain This File

- **Add a New Entry for Each Session:** At the start of a new development session, add a new date heading in `YYYY-MM-DD` format.
- **Use Subheadings:** Group related changes under subheadings like `Implemented Features`, `Bug Fixes & UX Improvements`, `Backend & Dependencies`, and `Documentation`.
- **Be Specific but Concise:** Briefly describe each change. For bugs, include a short summary of the issue and the solution.
- **Update Chronologically:** Always add the newest entries at the top of the file.

## 2025-10-30

### Implemented Features

- **Cloud Build for Model Downloads:**
    - Refactored the entire model download process to use Cloud Build instead of a direct backend stream. This makes the process more robust, scalable, and observable, and uses significantly fewer resources in the manager service itself.
    - Created `cloudbuild.yaml` templates for both Hugging Face and Ollama downloads.
- **Download Progress View:**
    - Implemented a dedicated UI screen to show the real-time status and logs of an in-progress Cloud Build download.
    - The main models list now shows a "View Progress" button for any models in a "downloading" state.
- **Background Status Checks:**
    - Created a new `/api/models/import/bulk-status` endpoint to check the status of multiple in-progress downloads.
    - The models list now automatically polls this endpoint in the background to update the status of models from "downloading" to "completed" or "failed".

### Bug Fixes & UX Improvements

- **Cloud Build & Deployment Fixes:**
    - Resolved a series of `INVALID_ARGUMENT` errors in the Cloud Build configuration related to secret handling, substitution variables (`$PATH`, `$HOME`), and command invocation (`huggingface-cli` vs. `hf`).
    - Corrected the `OLLAMA_MODELS` environment variable path in the deployment configuration to fix "read-only file system" errors at runtime.
    - Increased the startup probe timeout for vLLM services to prevent premature instance termination when loading large models.
- **UI Regressions & Fixes:**
    - Restored the pre-download "Confirmation" step that shows model size and GPU compatibility.
    - Fixed a bug where models in a "downloading" state were not appearing in the models list.
    - Implemented auto-scrolling for the log viewer in the progress screen.
    - Resolved multiple build-time and runtime TypeScript errors.

## 2025-10-29 (Final Session)

### Implemented Features

- **Edit Service Flow:**
    - Implemented a complete end-to-end flow for editing existing services.
    - The `ServiceDetailView` now has an "Edit" button that opens the familiar deployment screen, pre-filled with the service's current configuration.
    - Created a new backend API (`/api/services/update`) to handle the update logic.
    - The `DeployServiceView` component was refactored to be fully data-driven, deriving its state from the `existingService` prop when in edit mode.

### UI/UX Overhaul

- **Tabbed Service Details View:**
    - Refactored the `ServiceDetailView` to use a tabbed layout, mirroring the Google Cloud console.
    - Created a new "Details" tab that displays all service configuration (GPU, networking, etc.) in a dense, easy-to-read format.
    - Integrated the existing Logs, Permissions, and Chat components into their own tabs.

### Bug Fixes & UX Improvements

- **Log Viewer Enhancements:**
    - The log viewer now fetches the last two minutes of logs upon opening.
    - It automatically scrolls to the bottom when the tab is opened.
    - The polling interval was decreased to 1.5 seconds for a more real-time experience.
- **Corrected Deployment Payloads:**
    - Fixed a series of bugs where the deployment and update payloads were malformed, causing API errors (e.g., missing `labels`, incorrect `timeout` format, incorrect `vpcAccess` structure, and including read-only fields in update requests).
- **Resolved Infinite Re-render:** Fixed a `useEffect` dependency loop that was causing the "Edit Service" screen to crash.
- **Fixed Edit State Bugs:** Resolved issues where the service name was being incorrectly parsed and the VPC checkbox was not being set correctly when entering edit mode.

## 2025-10-29 (Evening Session)

### UI/UX Overhaul

- **Redesigned Import & Deploy Views:**
    - Completely refactored the "Import Model" and "Deploy Service" screens to use a dense, single-column layout, closely matching the modern Google Cloud console design.
    - Replaced the multi-step wizards and card-based layouts with a streamlined, single-form experience.
- **Improved Model Discovery:**
    - Created a new configuration file (`suggested-models.ts`) with a curated list of 15+ popular and high-performance models.
    - Replaced the basic suggestion links with a collapsible table of recommended models, showing descriptions, size, and target GPU.
    - Added "Explore More" links that direct users to the Ollama and Hugging Face libraries.
    - Made Ollama the default selection for new model imports.

### Implemented Features

- **Debounced Model Validation:**
    - Implemented a 300ms debounce on the "Model ID" input field. The application now automatically validates the model's existence as the user types, providing instant feedback with status icons.
- **VRAM & GPU Compatibility Checks:**
    - The "Import Model" flow now automatically calculates the estimated vRAM required after a model is validated. It displays a list of all GPUs in the target region, marking each as compatible or not.
    - If no GPUs in the region can support the model, a clear warning is shown, and the user must confirm their choice before downloading.
    - A final VRAM check was added to the "Deploy Service" screen, which warns the user if they select a GPU that is too small for the model.

### Bug Fixes & UX Improvements

- **Standardized Lowercase Regions:** Enforced the use of lowercase region names across the entire application—in the backend APIs, frontend state, and UI display—to fix a class of casing-related bugs.
- **Fixed Navigation State:** Resolved a bug where navigating to the "Models" or "Services" tabs would incorrectly show a detail view instead of the list. The view now correctly resets when the tab is clicked.
- **Corrected Service Name Validation:** Fixed a bug where the check for duplicate service names was failing due to the region casing issue.
- **Improved Import Flow:**
    - The "Import Model" flow now requires the user to select a bucket *before* validating a model, preventing a confusing UI state.
    - The bucket selection dropdown now shows the region for each bucket and no longer selects one by default.
    - The "Suggested Models" table is now collapsible and automatically closes after a model is selected.
- **Delayed Deployment Redirect:** Added a 5-second delay after a deployment is initiated before redirecting to the service detail page, giving the user time to read the confirmation message.

### Rollbacks

- **Removed GPU Quota Check:** The feature to check for available GPU quota was removed after repeated, unresolvable errors with the underlying Google Cloud client libraries.

## 2025-10-29

### Implemented Features

- **Dynamic GPU Resource Configuration:**
    - Updated the central `regions.ts` config file to include detailed information for each GPU type, including its availability status (`GA`, `Private Preview`), and valid vCPU and Memory configurations.
    - The "Deploy Service" UI is now fully dynamic. The vCPU and Memory dropdowns automatically update based on the selected GPU, ensuring only valid combinations can be deployed.
    - The GPU's availability status is now displayed in the selection dropdown.

### Backend & Deployment Fixes

- **Upgraded to `@google-cloud/run` Client:**
    - **Issue:** The generic `googleapis` library was unable to handle the `v2alpha1` API required for deploying services with Private Preview GPUs (like H100 and RTX 6000), causing deployment failures.
    - **Solution:** Replaced the `googleapis` client with the dedicated `@google-cloud/run` library in the deployment API. This new client correctly handles different API versions and modern authentication flows.
- **Added Alpha Launch Stage Annotation:**
    - **Issue:** Deployments with Private Preview GPUs were failing due to a missing `launchStage` annotation.
    - **Solution:** The deployment API now conditionally adds the `launchStage: 'ALPHA'` field to the service configuration when a Private Preview GPU is selected, satisfying the API requirement.
- **Corrected GPU Accelerator Names:**
    - **Issue:** The deployment API was using an incorrect accelerator name for the NVIDIA RTX 6000 Pro GPU.
    - **Solution:** Updated the `regions.ts` configuration to use the correct, API-validated accelerator string (`nvidia-rtx-pro-6000`).

### Bug Fixes

- **Fixed Build Error:** Resolved a syntax error (`const` declaration missing initialization) in the `DeployServiceView` component that was introduced during recent refactoring.

## 2025-10-28

### Implemented Features

- **VPC Networking in Deployment Flow:**
    - Integrated VPC network selection directly into the "Deploy Service" view. This allows users to connect new services to a VPC, which can accelerate model loading from GCS.
    - The UI now includes a "VPC Networking" card where users can enable VPC, select a subnet from a dynamically populated list, and enable "Private Google Access" with a single click if it's disabled.
    - The deployment API (`/api/services/deploy`) was updated to accept the VPC configuration and apply the correct annotations to the Cloud Run service.

### Bug Fixes

- **Corrected GPU Configuration in Deployment API:**
    - **Issue:** The deployment API was failing with a `400 Bad Request` error due to an invalid JSON payload for GPU configuration. The code was incorrectly attempting to use `hostPath` volumes and incorrect annotations (`run.googleapis.com/gpu-support`).
    - **Solution:** Reverted the logic to the correct implementation, which uses the `nodeSelector` field in the Cloud Run v2 API to specify the GPU accelerator type (e.g., `nvidia-l4`). This resolved the deployment failures.

## 2025-10-27 (Evening Session)

### Performance Enhancements

- **Client-Side Caching:** Implemented a client-side caching strategy for both the "Models" and "Services" lists using `localStorage`.
    - Views now load instantly from the cache, with a background fetch to update the data if it has changed.
    - This significantly improves the perceived performance and user experience when navigating the application.
- **Cache Invalidation:** The model list cache is automatically invalidated after a new model is successfully imported, ensuring data consistency.

### Bug Fixes & UX Improvements

- **Real-time Chat Streaming:** Rewrote the backend chat proxy (`/api/services/chat`) to correctly handle and forward streaming responses. The UI now displays chat messages token-by-token as they are generated by the LLM, providing a true real-time experience.
- **IAM Policy Robustness:** Implemented a retry mechanism in the "Permissions" card. It now attempts to fetch the IAM policy up to 10 times if it fails, gracefully handling the propagation delay for newly created services.
- **GPU Recommendations:** Fixed a bug where "Recommended GPUs" always showed "N/A". The logic now correctly normalizes the GCS bucket's region name (e.g., `US-CENTRAL1`) to lowercase to match the application's configuration (`us-central1`).
- **vLLM Model Listing:** Corrected an issue in the "Chat" component where listing models from a vLLM service would fail with a `405 Method Not Allowed` error. The request is now correctly sent using the `GET` method instead of `POST`.
- **Refresh Indicators:** Added refresh buttons with loading animations to the "Models", "Services", and "Live Logs" views, giving users a clear visual indicator when data is being fetched in the background.
- **UI Polish:**
    - Replaced the default refresh icon with an improved SVG design.
    - Added a custom, styled tooltip component for better UI consistency.
    - Fixed a `ReferenceError` for a missing `useCallback` import.

## 2025-10-27 (Afternoon Session)

### Implemented Features

- **Ollama Integration:**
    - Implemented a complete end-to-end workflow for downloading and deploying Ollama models.
    - **Model Import:** Created new backend APIs (`/api/models/import/ollama/*`) to stream models directly from the public Ollama OCI registry to GCS. This avoids the need for a local Ollama instance or intermediate file storage.
    - **GCS Structure:** The download logic now saves model files to the precise OCI-compliant directory structure that the Ollama container expects (`/blobs/sha256-<hash>`), resolving "file not found" errors at runtime.
    - **Deployment:** The "Deploy Model" view now dynamically configures the service for Ollama, setting the correct container image (`ollama/ollama`), port (`11434`), and environment variables (`OLLAMA_MODELS`, `MODEL`).
    - **Chat Support:** The "Chat" component is now fully compatible with Ollama services. It detects the model source, calls the correct API endpoint (`/api/chat`), and correctly parses Ollama's native streaming JSON response format.

### Bug Fixes & UX Improvements

- **Model Source Selection:** Replaced the "Model Source" dropdown with a more intuitive side-by-side card layout, which includes descriptions to help users choose between vLLM and Ollama.
- **Chat Streaming:** Fixed a React state management issue that was preventing the chat response from streaming token-by-token. The UI now updates correctly as each chunk is received.
- **Log Viewer Layout:** Corrected a CSS issue where the live log viewer would expand horizontally and break the page layout. The component now correctly contains long log lines with a horizontal scrollbar.
- **Build Failures:** Resolved a series of TypeScript and syntax errors across multiple components (`services.component.tsx`, `chat.component.tsx`, `models.component.tsx`) that were causing the `npm run build` command to fail.

## 2025-10-27

### Bug Fixes & UX Improvements

- **"Models" Tab - Import Flow:**
    - **Issue:** The bucket selection dropdown in the "Import Model" view only showed buckets previously managed by the tool, not all buckets in the project.
    - **Solution:** Changed the frontend to call the `/api/gcs/buckets` endpoint to ensure all project buckets are listed.
    - **Issue:** The UI for selecting or creating a bucket was unintuitive, using radio buttons and disabling parts of the form.
    - **Solution:** Refactored the UI to use a single dropdown for bucket selection and a "Create New Bucket" button that toggles a dedicated creation form. This simplifies the workflow.
    - **Issue:** A `ReferenceError` for `createBucket` would crash the component after the bucket selection UI was refactored.
    - **Solution:** Removed the faulty logic from the "Next" button's `disabled` check.
    - **Issue:** The import process was a rigid multi-step flow, requiring users to select a bucket before seeing the model details form.
    - **Solution:** Removed the "Next" button and combined the bucket and model selection into a single, unified form that is always active, streamlining the process.
    - **Issue:** Users had to manually type or paste full Hugging Face model IDs.
    - **Solution:** Added clickable suggestion buttons below the "Model ID" input to quickly prefill popular Gemma models.
    - **Issue:** The Hugging Face token field was a password input, obscuring the token.
    - **Solution:** Changed the input type to "text" for better usability.
    - **Issue:** The frontend was attempting to parse incomplete Server-Sent Events (SSE) messages during model download, causing console errors.
    - **Solution:** Implemented a buffering mechanism to ensure only complete SSE messages are parsed, making the progress updates more robust.

### Implemented Features

- **"Services" Tab - Live Data:**
    - Replaced the mock component with a functional UI that lists Cloud Run services.
    - Created the `/api/services/list` endpoint to fetch all services with the `managed-by: llm-manager` label across all supported regions.
    - Implemented a detail view that shows key information about a selected service, including a deep link to the Google Cloud Console.

- **Centralized Configuration:**
    - Created a new configuration file at `src/app/config/regions.ts` to act as a single source of truth for GPU-supported regions and the specific GPUs available in each.
    - Refactored the `/api/services/list` endpoint and the "Models" component (both `ImportModelView` and `DeployServiceView`) to use this centralized configuration.

### Bug Fixes & UX Improvements

- **Deployment API Error:**
    - **Issue:** The deployment polling logic was crashing with a `TypeError: is not iterable` because it was incorrectly destructuring the response from the `operations.get()` call.
    - **Solution:** Corrected the code to handle the single object response, resolving the runtime error.
- **Duplicate Service Name:**
    - **Issue:** The application allowed users to attempt to deploy a service with a name that already existed in the target region, causing a deployment failure.
    - **Solution:** Implemented a new `/api/services/exists` endpoint and added a debounced validation check in the UI to prevent duplicate service names and disable the deploy button if a conflict is detected.
- **Build & Runtime Errors:**
    - **Issue:** A series of build failures and runtime errors occurred due to faulty refactoring, including missing React imports, duplicate component definitions, incorrect import paths, and multiple default exports.
    - **Solution:** Systematically identified and fixed each issue by restoring missing code, removing duplicates, correcting paths, and ensuring all components are correctly defined and exported.
- **TypeScript Type Errors:**
    - **Issue:** The build was failing due to type incompatibilities between `google-auth-library` and `googleapis`.
    - **Solution:** Applied type casting (`as any`) in the affected API routes as a workaround to resolve the type conflicts.
- **Service Status Display:**
    - **Issue:** All services in the "Services" tab were incorrectly displayed with an "Error" status.
    - **Solution:** Updated the status detection logic to correctly interpret the Cloud Run API response, checking the `terminalCondition`, `reconciling` status, and comparing `latestReadyRevision` with `latestCreatedRevision` to accurately show "Running", "Deploying", or "Error" states.

## 2025-10-26

### Implemented Features

- **"Models" Tab - Core Functionality:**
    - Replaced the placeholder component with a full-featured UI for managing models.
    - The UI now discovers and lists GCS buckets that are managed by this tool by looking for a `llm-manager-metadata.json` file.
    - For each managed bucket, the view displays the models stored within, their size, estimated vRAM requirements, and recommended GPUs.
    - Implemented the "Import Model" workflow as a dedicated, single-page view with a card-based layout.

- **"Models" Tab - Import Workflow:**
    - **Bucket Selection:** The import view now features a dynamic bucket selection card. It lists all buckets in the project (not just managed ones) and allows for the creation of new buckets in GPU-supported regions.
    - **Model Source:** Users can now select between "Hugging Face (vLLM)" and "Ollama".
        - For Hugging Face, a list of suggested Google Gemma models is provided, while still allowing custom model IDs.
        - The Ollama option is present but disabled, showing a "Not yet implemented" message.
    - **Pre-flight Check:** Before downloading, a backend API (`/api/models/import/preflight`) validates the model ID, checks for gated models, and fetches file sizes. It now intelligently detects when a Hugging Face token is required and prompts the user.
    - **Streaming Download:** The backend (`/api/models/import/start`) streams model files directly from Hugging Face to GCS without saving them to the local disk, using Server-Sent Events (SSE) to provide real-time progress updates to the frontend.
    - **Metadata Update:** Upon successful download, the model's information, including its total size, is saved to the `llm-manager-metadata.json` file in the target bucket.

- **"Services" Tab - vLLM Deployment:**
    - **Deployment View:** Added a "Deploy" button to completed models, which navigates to a new view for configuring a vLLM service.
    - **Configuration UI:** The view includes cards for setting:
        - Service Name, Region (locked to the model's bucket region).
        - Container Image & Port (with vLLM defaults).
        - Billing (read-only, set to "Instance-based").
        - Service Scaling (Min/Max instances).
        - Resources (GPU, vCPU, Memory), with options constrained to L4 GPU limits.
        - GPU Zonal Redundancy (defaults to disabled for cost savings).
        - Volume Mounts (read-only, showing the GCS bucket path).
        - Container Arguments & Environment Variables (pre-filled with vLLM defaults).
    - **Deployment Backend:**
        - Created the `/api/services/deploy` endpoint to receive the service configuration.
        - The backend constructs the correct JSON payload for the Cloud Run Admin API v2, including the GCS FUSE volume mount, resource limits, and scaling settings.
        - The service is labeled with `managed-by: llm-manager` for future discovery.
        - The API streams back the status of the long-running deployment operation to the frontend.

### Bug Fixes & UX Improvements

- **Deployment API Payload:**
    - **Issue:** The deployment API was failing due to an incorrect JSON structure for specifying GPU resources and other settings.
    - **Solution:** After several iterations and debugging, the payload was corrected to match the specific requirements of the Cloud Run Admin API v2, separating resource counts, accelerator types, and annotations into their correct locations within the service template.
- **Error Visibility:**
    - **Issue:** Backend errors during the streaming deployment process were not being displayed in the UI.
    - **Solution:** Refactored the frontend's `handleDeploy` function to correctly parse the SSE stream, detect error messages, and display them in the progress view.

### Known Issues & To-Do

- **GPU Support:** The deployment UI currently only supports the NVIDIA L4 GPU. The UI and backend need to be updated to support other available types like H100 and RTX 6000.
- **Ollama Integration:** The workflow for importing and deploying Ollama models is not yet implemented.
- **Services Dashboard:** The main "Services" tab view for listing and managing existing deployments still needs to be implemented.

---

## 2025-10-25

### Implemented Features

- **Initial Project Setup:**
    - Created `design.md` to outline project goals, user journeys, and technical architecture.
    - Scaffolded the basic Next.js application structure with placeholder components for the main tabs (General, Models, Services).

- **"General" Tab - Application Identity:**
    - Added a card to display the application's identity (user or service account).
    - Implemented the `/api/project/identity` endpoint using `google-auth-library` to determine the identity via Application Default Credentials (ADC).

- **"General" Tab - Project Selection:**
    - Implemented a dynamic project selection card with two states: an "edit" mode and a "selected" mode.
    - Created backend APIs to support project selection:
        - `/api/project/list`: Fetches an initial list of projects.
        - `/api/project/search`: Provides debounced, server-side search for projects.
        - `/api/project/details`: Fetches details for a single project by ID.
    - The selected project is now persisted in local storage and displayed in the main header.
    - Added a manual input fallback for users who cannot list projects.

- **"General" Tab - Configuration Status:**
    - Implemented a card to display the status of required APIs and IAM permissions.
    - Created backend APIs to check configurations against the selected project:
        - `/api/project/service-usage`: Checks if Cloud Run and GCS APIs are enabled.
        - `/api/project/permissions`: Verifies if the application's identity has the necessary `roles/run.admin` and `roles/storage.admin` permissions.
    - The UI provides direct links to enable APIs and displays the required roles if permissions are missing.

### Bug Fixes & UX Improvements

- **Identity Resolution:**
    - **Issue:** The identity API could not resolve the email for local user credentials (`gcloud auth application-default login`).
    - **Solution:** The API was enhanced to use the user's access token to call the Google `userinfo` endpoint, correctly retrieving the email.

- **Project Selection UX:**
    - **Issue:** On page reload, the name of the selected project was not displayed correctly.
    - **Solution:** Implemented the `/api/project/details` endpoint to fetch the project's full information on load.
    - **Issue:** The "Confirm" button was disabled when selecting a project from a single-item search result.
    - **Solution:** Added an `onClick` handler to the `<select>` element to ensure the selection is always registered.
    - **Issue:** A race condition could cause the wrong project to be saved after a search.
    - **Solution:** Refined state management to correctly handle draft vs. confirmed project selections.
    - **Improvement:** Added "Confirm" and "Cancel" buttons for a more deliberate selection process.
    - **Improvement:** Added a "Loading..." message while the initial project data is being fetched.

- **UI Regressions:**
    - **Issue:** A `ReferenceError` for a missing `identity` variable crashed the page.
    - **Solution:** Re-initialized the missing state variable in the `General` component.
    - **Issue:** The "Application Identity" and "Project Selection" cards disappeared after a faulty component update.
    - **Solution:** Restored the full, correct JSX for the `General` component.

### Backend & Dependencies

- **Added Dependencies:**
    - `google-auth-library`: For Google Cloud authentication.
    - `googleapis`: To interact with Cloud Resource Manager and Service Usage APIs.
- **State Management:**
    - Lifted the `selectedProject` state from the `General` component to the parent `Home` component to share it with the `Header`.

### Documentation

- Created this `progress.md` file to serve as a running changelog for the project.