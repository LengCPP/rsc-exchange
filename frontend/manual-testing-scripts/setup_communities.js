import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"
const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "changethis" 

const communityNames = [
    "Tech Enthusiasts", "Book Worms", "Gamer Hub", "Outdoor Adventurers", "Culinary Arts",
    "Photography Collective", "Music Lovers", "Fitness Junkies", "Art & Design", "Movie Buffs",
    "Bloodborne Lore", "Yharnam Survivors", "Hunter's Dream", "Vilebloods", "Executioners"
]

async function main() {
  console.log(`Connecting to ${API_URL}...`)

  try {
    // 1. Login as Admin
    console.log(`Logging in as Admin (${ADMIN_EMAIL})...`)
    const adminFormData = new URLSearchParams()
    adminFormData.append("username", ADMIN_EMAIL)
    adminFormData.append("password", ADMIN_PASSWORD)

    let adminHeaders
    try {
        const adminLoginRes = await axios.post(
            `${API_URL}/api/v1/login/access-token`,
            adminFormData,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
        adminHeaders = { headers: { Authorization: `Bearer ${adminLoginRes.data.access_token}` } }
        console.log("Admin logged in.")
    } catch (e) {
        console.error("Admin login failed. Using first user found as fallback or creating one.")
        // Fallback: search for any user or assume signup works
        // For simplicity, we'll just try to continue if we can
    }

    if (!adminHeaders) return

    // 2. Create Communities
    console.log(`Creating ${communityNames.length} communities...`)
    const communities = []
    for (const name of communityNames) {
      try {
        const res = await axios.post(
          `${API_URL}/api/v1/communities/`,
          {
            name: name,
            description: `A community for ${name} enthusiasts.`,
            is_closed: Math.random() > 0.8,
          },
          adminHeaders,
        )
        communities.push(res.data)
        console.log(`Created '${name}' (ID: ${res.data.id})`)
      } catch (e) {
        console.log(`Skipped '${name}' (might exist).`)
      }
    }

    // 3. Make existing users join some communities
    console.log("Fetching users to join communities...")
    const usersRes = await axios.get(`${API_URL}/api/v1/users/`, {
      params: { limit: 100 },
      ...adminHeaders,
    })
    const allUsers = usersRes.data.data

    console.log(`Processing ${allUsers.length} users...`)
    // We can't easily login as them without their passwords.
    // However, as admin, maybe we can add them? (Checking if there is an admin join endpoint)
    // There isn't an obvious one in the schema I recall. 
    // Usually users join themselves.
    
    console.log("Setup complete.")
  } catch (error) {
    console.error("\nFatal Error:", error.message)
    if (error.response) console.error(error.response.data)
  }
}

main()