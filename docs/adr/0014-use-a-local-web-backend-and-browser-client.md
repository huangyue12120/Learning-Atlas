# Use a local web backend and browser client

The local-first application will run a backend only on the learner's machine and present its interface in the learner's browser. The backend owns SQLite access, content indexing, exports, and the OpenAI-compatible model adapter; the browser client renders the reader and accesses these capabilities through the local API.

This is preferred to a static-only site because learner data and model configuration require local services, and to a packaged desktop shell because a browser client keeps the first release easier to inspect, develop, and access across operating systems. The backend must bind locally by default and must not expose personal learning data or model credentials to a remote service.
