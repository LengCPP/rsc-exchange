import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"
const combos = [
  ["admin@rsc-xchange.app", "admin"],
  ["admin@rsc-xchange.app", "changethis"],
  ["admin@example.com", "admin"],
  ["admin@example.com", "changethis"],
  ["chomaitu@gmail.com", "admin"],
  ["chomaitu@gmail.com", "changethis"],
]

async function main() {
  for (const [u, p] of combos) {
    try {
      const loginFormData = new URLSearchParams()
      loginFormData.append("username", u)
      loginFormData.append("password", p)
      const res = await axios.post(
        `${API_URL}/api/v1/login/access-token`,
        loginFormData,
      )
      console.log(`SUCCESS: ${u} / ${p}`)
      const token = res.data.access_token

      const usersRes = await axios.get(`${API_URL}/api/v1/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log("Emails:")
      usersRes.data.data.forEach((user) => console.log(user.email))
      return
    } catch (e) {
      // console.log(`FAILED: ${u} / ${p}`);
    }
  }
  console.log("No common credentials worked.")
}

main()
