import AdminLogin from "../AdminLogin";

export default function AdminLoginExample() {
  return (
    <AdminLogin
      onLogin={() => console.log("Logged in")}
    />
  );
}
