import React from 'react';
import { Box, Text } from 'ink';
import { useSelector, useDispatch } from '../../store/store';
import { selectChatThreads, selectActiveThreadId } from '../../store/selectors';
import ThreadRow from './ThreadRow';

export function ThreadSidebar(): React.ReactElement {
  const threads = useSelector(selectChatThreads);
  const active = useSelector(selectActiveThreadId);
  const dispatch = useDispatch();

  return (
    <Box flexDirection="column" width={24} borderStyle="single">
      <Box><Text bold>Threads</Text></Box>
      {threads.map((t) => (
        <Box key={t.id} marginY={0}>
          <ThreadRow thread={t} isActive={t.id === active} />
        </Box>
      ))}
    </Box>
  );
}

export default ThreadSidebar;
