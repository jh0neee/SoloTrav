import React, { createContext, useContext, useState } from 'react';

type TabBarVisibilityContextType = {
  isTabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType>({
  isTabBarHidden: false,
  setTabBarHidden: () => {},
});

export function TabBarVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isTabBarHidden, setTabBarHidden] = useState(false);

  return (
    <TabBarVisibilityContext.Provider
      value={{ isTabBarHidden, setTabBarHidden }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}

