# Use learner-owned VS Code workspaces for practice

For a practical lesson, Learning Atlas will prepare a learner-owned workspace and hand it off to VS Code. The workspace contains the lesson's Python starter code, exercises, and tests, while the upstream submodules remain read-only and versioned course content remains separate.

The first integration will create and open the workspace only; learners run and debug code in their configured Python environment inside VS Code. The local application will preserve the reading context when they return. This is preferred to embedding a full IDE in the reader because VS Code already provides editing, debugging, terminals, environments, and source control without duplicating them in the application.
