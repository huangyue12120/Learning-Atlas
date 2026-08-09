# Use marimo for optional local exploration

Learning Atlas will offer marimo notebooks as optional, local interactive experiments for concepts that benefit from changing parameters and observing results. Each notebook starts from a versioned template copied into the learner's workspace, binds only to localhost, and opens in a separate browser tab with marimo's own local authentication.

Marimo complements rather than replaces VS Code: it is suited to compact explorations such as vector direction and projection, while lessons, exercises, debugging, and test runs remain in the learner-owned VS Code workspace. The first integration will launch a whitelisted notebook command only; it will not iframe marimo into the reader or execute arbitrary code submitted by the browser.
