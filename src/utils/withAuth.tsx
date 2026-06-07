import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter } from 'next/navigation';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { createClient } from '@/utils/supabase/client';

const withAuth = (WrappedComponent: React.ComponentType) => {
  const AuthenticatedComponent = (props: any) => {
    const accessToken = useSelector((state: RootState) => state.auth.accessToken);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const supabase = createClient();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // First check Redux store
          if (accessToken) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }

          // If not in Redux, check Supabase session
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            setIsAuthenticated(true);
          } else {
            // Redirect to login if not authenticated
            router.push('/auth/login');
          }
        } catch (error) {
          console.error('Authentication check failed:', error);
          router.push('/auth/login');
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [accessToken, router, supabase.auth]);

    // Show a loading spinner while checking authentication
    if (isLoading) {
      return (
        <Center height="100vh">
          <VStack gap={4}>
            <Spinner size="xl" />
            <Text>Checking authentication...</Text>
          </VStack>
        </Center>
      );
    }

    // If not authenticated, the redirect will happen in the useEffect
    // This component will unmount, but we still need a fallback
    if (!isAuthenticated) {
      return (
        <Center height="100vh">
          <Spinner size="xl" />
        </Center>
      );
    }

    return <WrappedComponent {...props} />;
  };

  return AuthenticatedComponent;
};

export default withAuth;
