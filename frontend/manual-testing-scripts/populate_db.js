import axios from "axios"
import FormData from "form-data"

const API_URL = process.env.VITE_API_URL || "http://localhost:8000"

const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

const communityNames = [
    "Tech Enthusiasts", "Book Worms", "Gamer Hub", "Outdoor Adventurers", "Culinary Arts",
    "Photography Collective", "Music Lovers", "Fitness Junkies", "Art & Design", "Movie Buffs",
    "Bloodborne Lore", "Yharnam Survivors", "Hunter's Dream", "Vilebloods", "Executioners"
]

const generalItems = [
    { title: "Old Laptop", description: "Still works, but slow.", type: "electronics" },
    { title: "Mountain Bike", description: "Used for 2 years, good condition.", type: "sports" },
    { title: "Acoustic Guitar", description: "Yamaha, needs new strings.", type: "music" },
    { title: "Coffee Maker", description: "Drip coffee maker, barely used.", type: "appliances" },
    { title: "Board Game Collection", description: "Various games like Catan, Pandemic.", type: "games" },
    { title: "Camping Tent", description: "4-person tent, waterproof.", type: "outdoor" },
    { title: "Yoga Mat", description: "Thick mat, purple color.", type: "fitness" },
    { title: "DSLR Camera", description: "Canon EOS 70D, includes lens.", type: "photography" }
]

const books = [
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", description: "A classic of American literature." },
    { title: "1984", author: "George Orwell", description: "Dystopian social science fiction." },
    { title: "To Kill a Mockingbird", author: "Harper Lee", description: "Pulitzer Prize-winning novel." },
    { title: "The Hobbit", author: "J.R.R. Tolkien", description: "Fantasy novel and precursor to Lord of the Rings." },
    { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", description: "First book in the Harry Potter series." },
    { title: "The Paleblood Sky", author: "Caryll Runes", description: "A mysterious book about the secrets of Yharnam." },
    { title: "The Old Hunters", author: "Ludwig", description: "Tales of the first hunters." }
]

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randomName = () => `${randomItem(firstNames)} ${randomItem(lastNames)}`
const randomEmail = (name) => `${name.toLowerCase().replace(/ /g, ".")}@example.com`

async function main() {
    const args = process.argv.slice(2)
    const numUsers = Number.parseInt(args[0]) || 10

    console.log(`Goal: Create ${numUsers} users, random communities, items and books.`)
    console.log(`Connecting to ${API_URL}...`)

    const users = []

    // 1. Create Users
    console.log(`\n1. Creating ${numUsers} users...`)
    for (let i = 0; i < numUsers; i++) {
        const fullName = randomName()
        const email = randomEmail(fullName)
        const password = "password123"

        try {
            await axios.post(`${API_URL}/api/v1/users/signup`, {
                email,
                password,
                full_name: fullName,
            })
            
            // Login to get token
            const formData = new URLSearchParams()
            formData.append("username", email)
            formData.append("password", password)
            const loginRes = await axios.post(`${API_URL}/api/v1/login/access-token`, formData)
            
            users.push({
                email,
                password,
                fullName,
                token: loginRes.data.access_token,
                headers: { Authorization: `Bearer ${loginRes.data.access_token}` }
            })
            process.stdout.write(".")
        } catch (e) {
            console.error(`\nFailed to create user ${email}: ${e.response?.data?.detail || e.message}`)
        }
    }

    if (users.length === 0) {
        console.error("No users created. Aborting.")
        return
    }

    // 2. Create Communities
    console.log(`\n\n2. Ensuring communities exist...`)
    const communities = []
    const admin = users[0] 
    for (const name of communityNames) {
        try {
            const res = await axios.post(`${API_URL}/api/v1/communities/`, {
                name,
                description: `Community for ${name} enthusiasts.`, 
            }, { headers: admin.headers })
            communities.push(res.data)
            process.stdout.write(".")
        } catch (e) {
            process.stdout.write("x")
        }
    }

    // Refresh communities list
    try {
        const res = await axios.get(`${API_URL}/api/v1/communities/`, { headers: admin.headers })
        communities.length = 0
        communities.push(...res.data.data)
    } catch (e) {
        console.error("\nFailed to fetch communities.")
    }

    // 3. Users join communities and add items
    console.log(`\n\n3. Users joining communities and adding items...`)
    for (const user of users) {
        // Join 2-4 random communities
        const myComms = communities.sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 3))
        for (const comm of myComms) {
            try {
                await axios.post(`${API_URL}/api/v1/communities/${comm.id}/join`, {}, { headers: user.headers })
            } catch (e) {}
        }

        // Add 3-5 random items
        const numItemsToAdd = 3 + Math.floor(Math.random() * 3)
        for (let i = 0; i < numItemsToAdd; i++) {
            const isBook = Math.random() > 0.5
            const itemData = isBook ? randomItem(books) : randomItem(generalItems)
            
            const formData = new FormData()
            formData.append("title", itemData.title)
            formData.append("description", itemData.description || "")
            formData.append("item_type", isBook ? "book" : (itemData.type || "general"))
            
            if (isBook) {
                formData.append("extra_data", JSON.stringify({ author: itemData.author }))
            }

            try {
                await axios.post(`${API_URL}/api/v1/items/`, formData, {
                    headers: {
                        ...user.headers,
                        ...formData.getHeaders()
                    }
                })
            } catch (e) {
                // console.error(`\nFailed to add item ${itemData.title}: ${e.response?.data?.detail || e.message}`);
            }
        }
        process.stdout.write(".")
    }

    // 4. Random Friendships
    console.log(`\n\n4. Sending random friend requests...`)
    for (const user of users) {
        try {
            const meRes = await axios.get(`${API_URL}/api/v1/users/me`, { headers: user.headers })
            user.id = meRes.data.id
        } catch (e) {}
    }

    for (const user of users) {
        const others = users.filter(u => u.id && u.id !== user.id).sort(() => 0.5 - Math.random()).slice(0, 3)
        for (const other of others) {
            try {
                await axios.post(`${API_URL}/api/v1/friends/${other.id}`, {}, { headers: user.headers })
            } catch (e) {}
        }
        process.stdout.write(".")
    }

    console.log(`\n\nDone! Created ${users.length} users and populated data.`)
}

main().catch(console.error)