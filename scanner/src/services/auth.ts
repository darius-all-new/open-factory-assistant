import axios from "axios";

// Default to localhost if VITE_API_URL is not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const auth = {
  async login(username: string, password: string): Promise<void> {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/token`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10000,
        }
      );

      if (response.data.access_token) {
        sessionStorage.setItem("token", response.data.access_token);
      }
    } catch (error) {
      console.error("Login error:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("Invalid credentials");
        }
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
      }
      throw error;
    }
  },

  logout(): void {
    sessionStorage.removeItem("token");
  },

  getToken(): string | null {
    return sessionStorage.getItem("token");
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  },
};
