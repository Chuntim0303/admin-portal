import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(awsExports);

function App() {
  const [count, setCount] = useState(0);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <>
          <div>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <h1>Vite + React + Amplify Auth</h1>

          <div className="card">
            <button onClick={() => setCount((count) => count + 1)}>
              count is {count}
            </button>
            <p>
              Hello, <strong>{user?.username}</strong> 👋
            </p>
            <button onClick={signOut}>Sign out</button>
          </div>

          <p className="read-the-docs">
            You are signed in with AWS Cognito Auth
          </p>
        </>
      )}
    </Authenticator>
  );
}

export default App;
