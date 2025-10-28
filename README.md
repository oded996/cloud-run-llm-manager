# Cloud Run LLM Manager

## 1. Objective

Deploying and managing open-source Large Language Models (LLMs) on Google Cloud Run with GPUs can be a complex, multi-step process. It often requires manual configuration of GCS for model storage, IAM for permissions, and the Cloud Run service itself—from selecting the right serving framework (like vLLM) to configuring GCS mounts and GPU settings.

This project is a self-contained Next.js application that provides a simple UI and a backend API to abstract and streamline this entire lifecycle. It acts as a "control plane" or "manager" to help you easily download, deploy, and monitor your LLM services on Cloud Run.

## 2. Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

### Running Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Authenticate with Google Cloud:**
    To run the application locally, you need to provide Application Default Credentials (ADC) so the backend can make authenticated calls to Google Cloud APIs.
    ```bash
    gcloud auth application-default login
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

4.  **Open the Application:**
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Deploying to Cloud Run

You can deploy the application directly from your source code to Cloud Run using `gcloud`.

**1. Important: Service Account Permissions**

For the manager to function correctly when deployed, it needs a service account with the appropriate permissions to manage other services and resources on your behalf.

**Create a Service Account:**
```bash
gcloud iam service-accounts create llm-manager-sa \
  --project=[PROJECT_ID] \
  --display-name="LLM Manager Service Account"
```

**Grant Required Roles:**
```bash
# Grant permissions to manage Cloud Run services
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member="serviceAccount:llm-manager-sa@[PROJECT_ID].iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant permissions to manage GCS buckets and objects
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member="serviceAccount:llm-manager-sa@[PROJECT_ID].iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Grant permissions to manage IAM policies for other services
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member="serviceAccount:llm-manager-sa@[PROJECT_ID].iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"
```

**2. Deploy the Service:**

Use the following command to build and deploy the application. Remember to replace `[PROJECT_ID]` and `[REGION]` with your own values.

```bash
gcloud run deploy llm-manager \
  --project=[PROJECT_ID] \
  --region=[REGION] \
  --service-account=llm-manager-sa@[PROJECT_ID].iam.gserviceaccount.com \
  --source . \
  --allow-unauthenticated
```

**Optional: Locking to a Single Project**

For a more secure or dedicated setup, you can lock the application to a single Google Cloud Project by setting the `GCP_PROJECT_ID` environment variable. When this variable is set, the project selection UI will be disabled.

You can set this during deployment:

```bash
gcloud run deploy llm-manager \
  --project=[PROJECT_ID] \
  --region=[REGION] \
  --service-account=llm-manager-sa@[PROJECT_ID].iam.gserviceaccount.com \
  --source . \
  --set-env-vars="GCP_PROJECT_ID=[PROJECT_ID_TO_LOCK]" \
  --allow-unauthenticated
```

**Note on `--allow-unauthenticated`**: This flag makes your manager UI publicly accessible. For production environments, it is highly recommended to remove this flag and secure your application using [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap).