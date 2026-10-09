import React from 'react';
import ShowroomStudio from '../showroom/ShowroomStudio';

export default function FrontendShowroomView({
  activeUseCase,
  nodes = [],
  edges = [],
  isDarkMode = true
}) {
  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
      <ShowroomStudio
        activeUseCase={activeUseCase}
        nodes={nodes}
        edges={edges}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
