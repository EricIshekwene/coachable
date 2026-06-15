// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VideoCard from "../../src/design-system/components/VideoCard";

describe("VideoCard", () => {
  it("renders title", () => {
    const { getByText } = render(<VideoCard title="My Video" />);
    expect(getByText("My Video")).toBeTruthy();
  });

  it("renders img when url provided and isReady", () => {
    const { container } = render(<VideoCard title="V" thumbnailUrl="http://x.com/t.jpg" isReady />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("does not render img when not ready", () => {
    const { container } = render(<VideoCard title="V" thumbnailUrl="http://x.com/t.jpg" isReady={false} />);
    expect(container.querySelector("img")).toBeFalsy();
  });

  it("renders duration when provided", () => {
    const { getByText } = render(<VideoCard title="V" duration="4:32" />);
    expect(getByText("4:32")).toBeTruthy();
  });

  it("no play overlay when not ready", () => {
    const { container } = render(<VideoCard title="V" isReady={false} onClick={() => {}} />);
    const overlays = container.querySelectorAll(".bg-black\\/20");
    expect(overlays.length).toBe(0);
  });

  it("renders badge when provided", () => {
    const { getByText } = render(<VideoCard title="V" badge={<span>Coming Soon</span>} />);
    expect(getByText("Coming Soon")).toBeTruthy();
  });

  it("renders data-component attribute", () => {
    const { container } = render(<VideoCard title="V" />);
    expect(container.querySelector('[data-component="VideoCard"]')).toBeTruthy();
  });
});
