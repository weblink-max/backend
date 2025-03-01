require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/blogs`;

app.use(cors());
app.use(bodyParser.json());

// 📌 Upload Blog
app.post("/api/upload", async (req, res) => {
    const { title, content, imageBase64, imageName } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title and content are required" });

    const blogId = uuidv4();
    const blogData = {
        id: blogId,
        title,
        content,
        imageUrl: imageName ? `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/images/${imageName}` : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Save blog JSON to GitHub
        await axios.put(`${GITHUB_API}/${blogId}.json`, {
            message: `Added blog: ${title}`,
            content: Buffer.from(JSON.stringify(blogData, null, 2)).toString("base64")
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        // Save image if provided
        if (imageBase64 && imageName) {
            await axios.put(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/images/${imageName}`, {
                message: `Uploaded image: ${imageName}`,
                content: imageBase64.split(",")[1]
            }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        }

        res.json({ message: "Blog uploaded successfully!", id: blogId, url: `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO}/tree/main/blogs/${blogId}.json` });
    } catch (error) {
        res.status(500).json({ error: "Failed to upload blog", details: error.message });
    }
});

// 📌 Get All Blogs
app.get("/api/blogs", async (req, res) => {
    try {
        const response = await axios.get(GITHUB_API, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        const blogs = response.data.map(file => ({
            id: file.name.replace(".json", ""),
            title: file.name.replace(".json", ""),
            url: file.download_url
        }));
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch blogs" });
    }
});

// 📌 Get Blog by ID
app.get("/api/blog/:id", async (req, res) => {
    const blogId = req.params.id;
    try {
        const response = await axios.get(`${GITHUB_API}/${blogId}.json`, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        const blogData = JSON.parse(Buffer.from(response.data.content, "base64").toString("utf8"));
        res.json(blogData);
    } catch (error) {
        res.status(404).json({ error: "Blog not found" });
    }
});

// 📌 Update Blog
app.put("/api/blog/:id", async (req, res) => {
    const blogId = req.params.id;
    const { title, content, imageBase64, imageName } = req.body;

    try {
        // Get existing blog
        const response = await axios.get(`${GITHUB_API}/${blogId}.json`, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        const existingData = JSON.parse(Buffer.from(response.data.content, "base64").toString("utf8"));
        const updatedData = { ...existingData, title, content, updatedAt: new Date().toISOString() };

        // Update blog in GitHub
        await axios.put(`${GITHUB_API}/${blogId}.json`, {
            message: `Updated blog: ${title}`,
            content: Buffer.from(JSON.stringify(updatedData, null, 2)).toString("base64"),
            sha: response.data.sha
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        // Update image if provided
        if (imageBase64 && imageName) {
            await axios.put(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/images/${imageName}`, {
                message: `Updated image: ${imageName}`,
                content: imageBase64.split(",")[1]
            }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        }

        res.json({ message: "Blog updated successfully!", id: blogId });
    } catch (error) {
        res.status(500).json({ error: "Failed to update blog" });
    }
});

// 📌 Delete Blog
app.delete("/api/blog/:id", async (req, res) => {
    const blogId = req.params.id;
    try {
        const response = await axios.get(`${GITHUB_API}/${blogId}.json`, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        await axios.delete(`${GITHUB_API}/${blogId}.json`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` },
            data: { message: `Deleted blog: ${blogId}`, sha: response.data.sha }
        });
        res.json({ message: "Blog deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete blog" });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
