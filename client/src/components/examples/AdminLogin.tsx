import AdminLogin from "../AdminLogin";

export default function AdminLoginExample() {
  return (
    <AdminLogin
      onLogin={(password) => console.log("Logged in with:", password)}
    />
  );
}
