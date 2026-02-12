<script lang="ts">
    import { pb } from "$lib/pb";
    import { goto } from "$app/navigation";

    let isSignUp = false;
    let email = "";
    let username = "";
    let password = "";
    let passwordConfirm = "";
    let error = "";
    let loading = false;

    // If already logged in, redirect
    if (pb.authStore.isValid) {
        goto("/room/general");
    }

    async function handleSubmit() {
        loading = true;
        error = "";

        try {
            if (isSignUp) {
                // Sign Up
                if (password !== passwordConfirm) {
                    throw new Error("Passwords do not match");
                }

                const data = {
                    email,
                    username,
                    password,
                    passwordConfirm,
                    emailVisibility: true,
                };

                // Create user
                await pb.collection("users").create(data);

                // Optimally, sign them in automatically
                await pb.collection("users").authWithPassword(email, password);
            } else {
                // Sign In
                await pb.collection("users").authWithPassword(email, password);
            }

            goto("/room/general");
        } catch (e: any) {
            console.error(e);
            error = e.message || "An error occurred";
        } finally {
            loading = false;
        }
    }

    function toggleMode() {
        isSignUp = !isSignUp;
        error = "";
        username = "";
        password = "";
        passwordConfirm = "";
    }
</script>

<div class="container">
    <div class="signin-box">
        <h1>{isSignUp ? "Create Account" : "Sign In"}</h1>
        {#if error}
            <div class="error">{error}</div>
        {/if}
        <form on:submit|preventDefault={handleSubmit}>
            {#if isSignUp}
                <div class="input-group">
                    <label for="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        bind:value={username}
                        required
                    />
                </div>
            {/if}

            <div class="input-group">
                <label for="email"
                    >{isSignUp ? "Email" : "Email or Username"}</label
                >
                <input type={isSignUp ? 'email' : 'text'} id="email" bind:value={email} required />
            </div>

            <div class="input-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    required
                />
            </div>

            {#if isSignUp}
                <div class="input-group">
                    <label for="passwordConfirm">Confirm Password</label>
                    <input
                        type="password"
                        id="passwordConfirm"
                        bind:value={passwordConfirm}
                        required
                    />
                </div>
            {/if}

            <button type="submit" disabled={loading}>
                {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>

            <div class="footer">
                <button type="button" class="link-btn" on:click={toggleMode}>
                    {isSignUp
                        ? "Already have an account? Sign In"
                        : "Need an account? Sign Up"}
                </button>
            </div>
        </form>
    </div>
</div>

<style>
    .container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: #f0f2f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif;
    }

    .signin-box {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
    }

    h1 {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #333;
    }

    .error {
        background-color: #fee;
        color: #c00;
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        text-align: center;
    }

    .input-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        color: #555;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
    }

    button[type="submit"] {
        width: 100%;
        padding: 0.75rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        transition: background-color 0.2s;
    }

    button[type="submit"]:hover:not(:disabled) {
        background-color: #0056b3;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .footer {
        margin-top: 1rem;
        text-align: center;
    }

    .link-btn {
        background: none;
        border: none;
        color: #007bff;
        cursor: pointer;
        padding: 0;
        font-size: 0.9rem;
        text-decoration: underline;
    }

    .link-btn:hover {
        color: #0056b3;
    }
</style>
