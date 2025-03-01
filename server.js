const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// GitHub Repo Details
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;  // Your GitHub Username
const GITHUB_REPO = process.env.GITHUB_REPO;  // Your Repo Name
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;  // Your GitHub Token

// 📌 API Route to Upload Blog Content
app.post("/api/upload", async (req, res) => {
    const { title, content, imageBase64, imageName } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required." });
    }

    try {
        // Format the blog content
        const blogFilePath = `blogs/${title.replace(/ /g, "_")}.md`;
        const blogContent = `# ${title}\n\n${content}`;

        // Upload Blog Text
        await uploadToGitHub(blogFilePath, blogContent);

        // Upload Image (if provided)
        if (imageBase64 && imageName) {
            const imagePath = `images/${imageName}`;
            await uploadToGitHub(imagePath, imageBase64, true);
        }

        res.json({ message: "Blog uploaded successfully!", link: `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO}/tree/main/blogs` });
    } catch (error) {
        res.status(500).json({ error: "Error uploading blog", details: error.message });
    }
});

// 📌 Function to Upload to GitHub
async function uploadToGitHub(filePath, content, isImage = false) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;

    // Convert content to Base64 (required by GitHub API)
    const encodedContent = isImage ? content : Buffer.from(content, "utf8").toString("base64");

    const headers = {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
    };

    // Get current file SHA (if exists)
    let sha = null;
    try {
        const existingFile = await axios.get(url, { headers });
        sha = existingFile.data.sha;
    } catch (error) {
        // File doesn't exist, so no SHA needed
    }

    // Create or update the file in GitHub
    await axios.put(url, {
        message: `Uploaded: ${filePath}`,
        content: encodedContent,
        sha: sha || undefined,
    }, { headers });
}

// 📌 Start the Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
