import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"

async function main() {
  const randomString = Math.random().toString(36).substring(7)
  const tempUser = {
    email: `list_temp_${randomString}@test.com`,
    password: "password123",
    full_name: "User Lister",
  }

  try {
    // 1. Register
    await axios.post(`${API_URL}/api/v1/users/signup`, tempUser)

    // 2. Login
    const loginFormData = new URLSearchParams()
    loginFormData.append("username", tempUser.email)
    loginFormData.append("password", tempUser.password)
    const loginRes = await axios.post(
      `${API_URL}/api/v1/login/access-token`,
      loginFormData,
    )
    const token = loginRes.data.access_token
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

    // 3. Try to list users
    console.log("Attempting to list users...")
    try {
      const usersRes = await axios.get(`${API_URL}/api/v1/users/`, authHeaders)
      console.log("All Users Found via /users/:")
      usersRes.data.data.forEach((u) =>
        console.log(`- ${u.email} (ID: ${u.id})`),
      )
    } catch (e) {
      console.log(
        "List users failed (likely admin-only). Trying search fallback...",
      )
      // Fallback: search for '@' which should match most emails
      const searchRes = await axios.get(`${API_URL}/api/v1/search/`, {
        params: { q: "@", limit: 100 },
        ...authHeaders,
      })
      console.log('Users found via search for "@":')
      searchRes.data.users.forEach((u) => console.log(`- ${u.email}`))
    }
  } catch (error) {
    console.error("Error:", error.message)
    if (error.response) console.error(error.response.data)
  }
}

main()
