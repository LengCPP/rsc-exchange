import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"
const TARGET_EMAIL = "chomaitu@gmail.com"
const PASSWORD = "password123"

async function main() {
    console.log(`Accepting all pending friend requests for ${TARGET_EMAIL}...`)

    try {
        const formData = new URLSearchParams()
        formData.append("username", TARGET_EMAIL)
        formData.append("password", PASSWORD)
        const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
        const headers = { Authorization: `Bearer ${loginRes.data.access_token}` }

        // 1. Get pending requests
        const requestsRes = await axios.get(`${API_URL}/api/v1/friends/requests`, { headers })
        const pending = requestsRes.data.data
        console.log(`Found ${pending.length} pending requests.`)

        // 2. Accept each one
        for (const user of pending) {
            try {
                await axios.post(`${API_URL}/api/v1/friends/accept/${user.id}`, {}, { headers })
                console.log(`- Accepted friend request from ${user.email}`)
            } catch (e) {
                console.error(`- Failed to accept ${user.email}: ${e.response?.data?.detail || e.message}`)
            }
        }
    } catch (e) {
        console.error(`Failed: ${e.response?.data?.detail || e.message}`)
    }

    console.log("Process complete.")
}

main()
