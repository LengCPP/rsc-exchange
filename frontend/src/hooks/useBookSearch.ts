import { useQuery } from "@tanstack/react-query"

export interface BookResult {
  title: string
  authors: string[]
  description: string
  isbn: string
  thumbnail: string
}

export const useBookSearch = (query: string) => {
  return useQuery({
    queryKey: ["bookSearch", query],
    queryFn: async () => {
      if (!query || query.length < 3) return []
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
      const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
        query,
      )}&maxResults=5&printType=books${apiKey ? `&key=${apiKey}` : ""}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch books")
      const data = await response.json()

      return (data.items || []).map((item: any) => {
        const volumeInfo = item.volumeInfo
        const isbns = volumeInfo.industryIdentifiers || []
        const isbn13 = isbns.find(
          (id: any) => id.type === "ISBN_13",
        )?.identifier
        const isbn10 = isbns.find(
          (id: any) => id.type === "ISBN_10",
        )?.identifier

        return {
          title: volumeInfo.title,
          authors: volumeInfo.authors || [],
          description: volumeInfo.description || "",
          isbn: isbn13 || isbn10 || "",
          thumbnail: volumeInfo.imageLinks?.thumbnail || "",
        }
      }) as BookResult[]
    },
    enabled: query.length >= 3,
  })
}
