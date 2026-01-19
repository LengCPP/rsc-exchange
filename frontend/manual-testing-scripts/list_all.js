import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"

async function main() {
    const formData = new URLSearchParams()
    formData.append("username", "admin@example.com")
    formData.append("password", "changethis")
    
    try {
        const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
        const headers = { Authorization: `Bearer ${loginRes.data.access_token}` }
        
        const usersRes = await axios.get(`${API_URL}/api/v1/users/`, { headers })
        console.log("All Users:")
        usersRes.data.data.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`))
    } catch (e) {
        console.error("Failed to list users:", e.response?.data || e.message)
    }
}

main()
