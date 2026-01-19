import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"
const TARGET_EMAIL = "chomaitu@gmail.com"
const TARGET_ID = "f77e9095-b013-47ce-a622-4f93b28f3037"
const PASSWORD = "password123"

const potentialFriends = [
    "elizabeth.johnson@example.com",
    "mary.taylor@example.com",
    "susan.miller@example.com",
    "michael.johnson@example.com",
    "charles.williams@example.com"
]

async function main() {
    console.log(`Establishing friendships for ${TARGET_EMAIL}...`)

    // 1. Send requests from others to target
    for (const email of potentialFriends) {
        try {
            const formData = new URLSearchParams()
            formData.append("username", email)
            formData.append("password", PASSWORD)
            const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
            const headers = { Authorization: `Bearer ${loginRes.data.access_token}` }

            // Route: POST /api/v1/friends/request/{friend_id}
            await axios.post(`${API_URL}/api/v1/friends/request/${TARGET_ID}`, {}, { headers })
            console.log(`- Request sent from ${email}`)
        } catch (e) {
            console.error(`- Failed to send request from ${email}: ${e.response?.data?.detail || e.message}`)
        }
    }

    // 2. Accept requests as target
    try {
        const formData = new URLSearchParams()
        formData.append("username", TARGET_EMAIL)
        formData.append("password", PASSWORD)
        const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
        const headers = { Authorization: `Bearer ${loginRes.data.access_token}` }

        for (const email of potentialFriends) {
            try {
                const searchRes = await axios.get(`${API_URL}/api/v1/search/`, {
                    params: { q: email },
                    headers
                })
                const friend = searchRes.data.users.find(u => u.email === email)
                if (friend) {
                    // Route: POST /api/v1/friends/accept/{friend_id}
                    await axios.post(`${API_URL}/api/v1/friends/accept/${friend.id}`, {}, { headers })
                    console.log(`- Accepted friend: ${email}`)
                }
            } catch (e) {
                 console.error(`- Failed to accept ${email}: ${e.response?.data?.detail || e.message}`)
            }
        }
    } catch (e) {
        console.error(`Failed to login as target ${TARGET_EMAIL}: ${e.response?.data?.detail || e.message}`)
    }

    console.log("Friendship process complete.")
}

main()
