import { useState } from "react";
import { Auth } from "aws-amplify/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignIn(e) {
    e.preventDefault();
    try {
      const user = await Auth.signIn(email, password);
      console.log("Signed in:", user);
      onLogin(user); // Pass user back to parent
    } catch (err) {
      setError(err.message || "Error signing in");
    }
  }

  return (
    <div className="login-box">
      <h2>My Custom Login</h2>
      <form onSubmit={handleSignIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Sign In</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
