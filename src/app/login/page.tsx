"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FaGoogle } from 'react-icons/fa';

export default function Login() {
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">Welcome to CheckDay</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The easiest way to plan your day
          </p>
        </CardHeader>
        <CardBody className="space-y-6">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center"
            variant="outline"
          >
            <FaGoogle className="mr-2" />
            Sign in with Google
          </Button>
        </CardBody>
      </Card>
    </div>
  );
} 