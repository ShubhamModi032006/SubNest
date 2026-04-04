"use client";

import { useAuthStore } from "@/store/authStore";
import { BarChart3, Users, CreditCard, Activity } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { name: 'Total Subscriptions', value: '142', icon: CreditCard, change: '+12.5%' },
    { name: 'Active Users', value: '2,845', icon: Users, change: '+5.2%' },
    { name: 'Revenue', value: '$12,450', icon: BarChart3, change: '+18.1%' },
    { name: 'System Status', value: 'Healthy', icon: Activity, change: '99.9% uptime' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {user?.name || user?.email || "User"}</h1>
        <p className="mt-2 text-muted-foreground">
          Here's an overview of your workspace today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/20 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-primary group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-emerald-500 font-medium">{stat.change}</span>
                <span className="ml-2 text-muted-foreground">from last month</span>
              </div>
              
              {/* Decorative accent */}
              <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur-xl min-h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Recent Activity Placeholder</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur-xl min-h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Income Overview Placeholder</p>
        </div>
      </div>
    </div>
  );
}
