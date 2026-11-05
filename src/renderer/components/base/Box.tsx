import { PropsWithChildren } from 'react';

const Box = ({ children }: PropsWithChildren) => {
  return <div className="card">{children}</div>;
};

export default Box;
