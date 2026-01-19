import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"
const TARGET_EMAIL = "chomaitu@gmail.com"
const TARGET_ID = "f77e9095-b013-47ce-a622-4f93b28f3037"
const NEW_PASSWORD = "password123"

async function main() {
    console.log(`Resetting password for ${TARGET_EMAIL}...`)

    // 1. Login as Admin
    const formData = new URLSearchParams()
    formData.append("username", "admin@example.com")
    formData.append("password", "changethis")
    
    try {
        const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
        const headers = { Authorization: `Bearer ${loginRes.data.access_token}` }
        
        // 2. Update user password
        await axios.patch(`${API_URL}/api/v1/users/${TARGET_ID}`, {
            password: NEW_PASSWORD
        }, { headers })
        
        console.log("Password reset successfully.")
    } catch (e) {
        console.error("Failed to reset password:", e.response?.data || e.message)
    }
}

main()
