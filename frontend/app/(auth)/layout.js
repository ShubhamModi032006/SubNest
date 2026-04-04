export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
