import React from "react";
import { ScrollView, RefreshControl } from "react-native";

const RefreshableScrollView = ({
  refreshing,
  onRefresh,
  children,
  ...props
}) => {
  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default RefreshableScrollView;
