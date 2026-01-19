import axios from "axios"
import FormData from "form-data"

const API_URL = "http://localhost:8000"
const TEST_EMAIL = `test_minio_${Math.random().toString(36).substring(7)}@example.com`

async function main() {
    console.log("Testing Minio Upload...")

    // 1. Signup
    await axios.post(`${API_URL}/api/v1/users/signup`, {
        email: TEST_EMAIL,
        password: "password123",
        full_name: "Minio Tester"
    })
    console.log(`User ${TEST_EMAIL} created.`)

    // 2. Login
    const loginData = new URLSearchParams()
    loginData.append("username", TEST_EMAIL)
    loginData.append("password", "password123")
    const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, loginData)
    const token = loginRes.data.access_token
    const headers = { Authorization: `Bearer ${token}` }
    console.log("Logged in.")

    // 3. Create Item with Image
    const formData = new FormData()
    formData.append("title", "Minio Test Item")
    formData.append("description", "Testing image upload to Minio")
    formData.append("item_type", "general")
    
    // Create a dummy image buffer (a tiny valid PNG)
    const dummyImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")
    formData.append("image", dummyImage, { filename: "test.png", contentType: "image/png" })

    console.log("Uploading item with image...")
    try {
        const itemRes = await axios.post(`${API_URL}/api/v1/items/`, formData, {
            headers: {
                ...headers,
                ...formData.getHeaders()
            }
        })
        
        const imageUrl = itemRes.data.image_url
        console.log(`Item created. Image URL: ${imageUrl}`)

        if (imageUrl && imageUrl.startsWith("/api/v1/storage/image/")) {
            console.log("SUCCESS: Image URL is a proxy URL.")
            
            // 4. Try to fetch the image via proxy
            console.log("Testing proxy image retrieval...")
            const imgFetch = await axios.get(`${API_URL}${imageUrl}`, { responseType: "arraybuffer" })
            if (imgFetch.status === 200) {
                console.log("SUCCESS: Image retrieved via proxy.")
            } else {
                console.log(`FAILED: Proxy retrieval returned ${imgFetch.status}`)
            }
        } else {
            console.log("FAILED: Image URL is not in expected proxy format.")
        }
    } catch (e) {
        console.error("Upload failed:", e.response?.data || e.message)
    }
}

main()
