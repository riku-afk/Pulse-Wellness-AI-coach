import type { FC } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-headline">
        {title}
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">{description}</p>
    </div>
  );
};
