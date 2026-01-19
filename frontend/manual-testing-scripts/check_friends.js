import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"
const TARGET_EMAIL = "chomaitu@gmail.com"
const PASSWORD = "password123"

async function main() {
    console.log(`Checking friends for ${TARGET_EMAIL}...`)

    const formData = new URLSearchParams()
    formData.append("username", TARGET_EMAIL)
    formData.append("password", PASSWORD)
    
    try {
        const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
        const headers = { Authorization: `Bearer ${loginRes.data.access_token}` }
        
        const friendsRes = await axios.get(`${API_URL}/api/v1/friends/`, { headers })
        console.log(`Friend count: ${friendsRes.data.count}`)
        friendsRes.data.data.forEach(f => console.log(`- ${f.email}`))
        
        const requestsRes = await axios.get(`${API_URL}/api/v1/friends/requests`, { headers })
        console.log(`Pending request count: ${requestsRes.data.count}`)
        requestsRes.data.data.forEach(r => console.log(`- ${r.email}`))
    } catch (e) {
        console.error("Failed:", e.response?.data || e.message)
    }
}

main()
