import { cn } from '../utils';
import type { IconProps } from 'grommet-icons';
import type { ComponentType, AnchorHTMLAttributes } from 'react';

type BaseIconButtonProps = {
  icon: ComponentType<{ color?: string; size?: string | number }>;
  color?: string;
  iconSize?: IconProps['size'];
  outline?: boolean;
};

type HTMLButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
type IconButtonAsLinkProps = BaseIconButtonProps &
  HTMLButtonProps &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target'>;
type IconButtonAsButtonProps = BaseIconButtonProps &
  HTMLButtonProps & {
    href?: never;
    target?: never;
  };

type IconButtonProps = IconButtonAsLinkProps | IconButtonAsButtonProps;

export const IconButton = (props: IconButtonProps) => {
  const {
    icon: Icon,
    iconSize,
    color = 'var(--text-primary)',
    outline = false,
    className,
    children,
    href,
    target,
    ...restProps
  } = props;

  const button = (
    <button
      {...restProps}
      className={cn(
        'inline-flex items-center justify-center rounded p-2!',
        outline && 'border-transparent! not-hover:bg-transparent!',
        className,
      )}>
      <Icon color={color} size={iconSize} />
      {children}
    </button>
  );

  return href ? (
    <a href={href} target={target}>
      {button}
    </a>
  ) : (
    button
  );
};
